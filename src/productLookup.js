import { supabase } from './supabaseClient.js';

/**
 * Looks up a ready-made/loose product by its barcode, plus how much stock
 * and what price this location has for it. Returns null if not found, not
 * configured, or the lookup fails -- the caller (OrderBuilder) just shows
 * "unknown barcode" rather than throwing, same resilience rule as the rest
 * of the app.
 *
 * `price` on the returned product is this shop's own price if it has set
 * one (per-shop pricing, see docs/supabase-setup.md §9), falling back to the
 * shared `products.price` as a default for a shop that hasn't priced this
 * item yet.
 */
export async function lookupProductByBarcode(barcode, locationId) {
  if (!supabase || !barcode.trim()) return null;
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode.trim())
      .eq('is_active', true)
      .maybeSingle();
    if (error || !product) return null;

    let qtyOnHand = null;
    let price = product.price;
    if (locationId) {
      const { data: stock } = await supabase
        .from('stock_levels')
        .select('qty_on_hand, price')
        .eq('product_id', product.id)
        .eq('location_id', locationId)
        .maybeSingle();
      qtyOnHand = stock ? Number(stock.qty_on_hand) : 0;
      if (stock?.price != null) price = Number(stock.price);
    }

    return { ...product, qtyOnHand, price };
  } catch (err) {
    console.error('Barcode lookup failed', err);
    return null;
  }
}

/**
 * Same as above but by name, for the manual search fallback when scanning
 * isn't available. Returns up to `limit` active products matching the term.
 */
export async function searchProductsByName(term, locationId, limit = 8) {
  if (!supabase || !term.trim()) return [];
  try {
    const escaped = term.trim().replace(/[%,]/g, '');
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or(`name_en.ilike.%${escaped}%,name_mr.ilike.%${escaped}%`)
      .limit(limit);
    if (error || !products) return [];

    if (!locationId || products.length === 0) {
      return products.map((p) => ({ ...p, qtyOnHand: null }));
    }

    const { data: stockRows } = await supabase
      .from('stock_levels')
      .select('product_id, qty_on_hand, price')
      .eq('location_id', locationId)
      .in('product_id', products.map((p) => p.id));
    const stockByProduct = new Map((stockRows || []).map((s) => [s.product_id, s]));

    return products.map((p) => {
      const stock = stockByProduct.get(p.id);
      return {
        ...p,
        qtyOnHand: stock ? Number(stock.qty_on_hand) : 0,
        price: stock?.price != null ? Number(stock.price) : p.price,
      };
    });
  } catch (err) {
    console.error('Product search failed', err);
    return [];
  }
}

/**
 * Every active product with this shop's price and stock, for the counter's
 * product grid. Read-only; same per-shop price fallback as the lookups above.
 */
export async function listProducts(locationId, limit = 120) {
  if (!supabase) return [];
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name_en')
      .limit(limit);
    if (error || !products) return [];
    if (!locationId || products.length === 0) {
      return products.map((p) => ({ ...p, qtyOnHand: null }));
    }
    const { data: stockRows } = await supabase
      .from('stock_levels')
      .select('product_id, qty_on_hand, price')
      .eq('location_id', locationId);
    const stockByProduct = new Map((stockRows || []).map((s) => [s.product_id, s]));
    return products.map((p) => {
      const stock = stockByProduct.get(p.id);
      return {
        ...p,
        qtyOnHand: stock ? Number(stock.qty_on_hand) : 0,
        price: stock?.price != null ? Number(stock.price) : p.price,
      };
    });
  } catch (err) {
    console.error('Product list failed', err);
    return [];
  }
}

/**
 * Best-effort stock decrement after a bill with product lines has logged
 * successfully. Fire-and-forget -- a failure here never undoes or blocks a
 * completed sale, it just means the owner has to notice and correct the
 * stock count manually later.
 */
export async function decrementStock(locationId, productLines) {
  if (!supabase || !locationId || productLines.length === 0) return;
  for (const line of productLines) {
    try {
      const { error } = await supabase.rpc('decrement_stock', {
        p_product_id: line.productId,
        p_location_id: locationId,
        p_qty: line.qty,
      });
      if (error) console.error('Failed to decrement stock', error);
    } catch (err) {
      console.error('Failed to decrement stock', err);
    }
  }
}
