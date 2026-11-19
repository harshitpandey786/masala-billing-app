import { supabase } from './supabaseClient.js';

/**
 * Pure aggregation: every (product, shop) combination at or below that
 * product's reorder level. `products`/`stockLevels`/`locations` are handed
 * in by whoever already loaded them (AdminProducts.jsx's grid), so this
 * never issues its own query there -- `fetchLowStock` below is the
 * standalone version for screens that don't already have those lists in
 * hand (the shop start screen, the owner dashboard).
 */
export function computeLowStock(products, stockLevels, locations) {
  const locationById = new Map(locations.map((l) => [l.id, l]));
  const productById = new Map(products.map((p) => [p.id, p]));
  const items = [];
  for (const stock of stockLevels) {
    const product = productById.get(stock.product_id);
    if (!product || product.is_active === false) continue;
    const reorderLevel = Number(product.reorder_level ?? 5);
    const qty = Number(stock.qty_on_hand) || 0;
    if (qty > reorderLevel) continue;
    items.push({
      productId: product.id,
      name: product.name_en,
      locationId: stock.location_id,
      locationName: locationById.get(stock.location_id)?.name || '',
      qtyOnHand: qty,
      reorderLevel,
    });
  }
  return items.sort((a, b) => a.qtyOnHand - b.qtyOnHand);
}

/**
 * Standalone fetch + compute for screens that only need the low-stock list
 * itself. `locationId` scopes to one shop (the counter's own start screen);
 * omitted, it checks every shop (the owner dashboard). Fails quiet -- a
 * missing `reorder_level` column (docs/supabase-setup.md §12a not run yet)
 * or any other error just means no alerts show, same resilience rule as the
 * rest of this app.
 */
export async function fetchLowStock({ locationId } = {}) {
  if (!supabase) return [];
  try {
    const [p, l, s] = await Promise.all([
      supabase.from('products').select('id, name_en, is_active, reorder_level').eq('is_active', true),
      supabase.from('locations').select('id, name'),
      locationId
        ? supabase.from('stock_levels').select('product_id, location_id, qty_on_hand').eq('location_id', locationId)
        : supabase.from('stock_levels').select('product_id, location_id, qty_on_hand'),
    ]);
    if (p.error || l.error || s.error) {
      console.error('Failed to fetch low stock', p.error || l.error || s.error);
      return [];
    }
    return computeLowStock(p.data || [], s.data || [], l.data || []);
  } catch (err) {
    console.error('Failed to fetch low stock', err);
    return [];
  }
}
