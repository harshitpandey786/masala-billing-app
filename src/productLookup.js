import { supabase } from './supabaseClient.js';

// `qtyOnHand` is null when this shop has no stock row for the product yet --
// "not tracked", not "zero left". Only a row that's actually been counted
// down to 0 means out of stock.
function withShopStock(product, stock) {
  return {
    ...product,
    qtyOnHand: stock ? Number(stock.qty_on_hand) : null,
    price: stock?.price != null ? Number(stock.price) : product.price,
  };
}

async function stockFor(locationId, productIds) {
  if (!locationId || productIds.length === 0) return new Map();
  const { data } = await supabase
    .from('stock_levels')
    .select('product_id, qty_on_hand, price')
    .eq('location_id', locationId)
    .in('product_id', productIds);
  return new Map((data || []).map((s) => [s.product_id, s]));
}

/**
 * Looks up a ready-made/loose product by its barcode, with this shop's own
 * price (per-shop pricing, see docs/supabase-setup.md §9) falling back to
 * the shared `products.price`. Returns null if not found, not configured, or
 * the lookup fails -- the counter just shows "unknown barcode" rather than
 * throwing.
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
    const stock = await stockFor(locationId, [product.id]);
    return withShopStock(product, stock.get(product.id));
  } catch (err) {
    console.error('Barcode lookup failed', err);
    return null;
  }
}

/**
 * Every active product with this shop's price and stock, for the counter's
 * product grid. Read-only.
 */
export async function listProducts(locationId) {
  if (!supabase) return [];
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name_en');
    if (error || !products) return [];
    const { data: stockRows } = locationId
      ? await supabase.from('stock_levels').select('product_id, qty_on_hand, price').eq('location_id', locationId)
      : { data: [] };
    const stockByProduct = new Map((stockRows || []).map((s) => [s.product_id, s]));
    return products.map((p) => withShopStock(p, stockByProduct.get(p.id)));
  } catch (err) {
    console.error('Product list failed', err);
    return [];
  }
}

/**
 * The given products at this shop's *current* price -- used to rebuild a
 * past order at today's prices. Inactive or deleted products are simply
 * missing from the result.
 */
export async function getProductsByIds(ids, locationId) {
  if (!supabase || ids.length === 0) return [];
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .in('id', ids)
      .eq('is_active', true);
    if (error || !products) return [];
    const stock = await stockFor(
      locationId,
      products.map((p) => p.id)
    );
    return products.map((p) => withShopStock(p, stock.get(p.id)));
  } catch (err) {
    console.error('Product lookup by id failed', err);
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
