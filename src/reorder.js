import { getRecipeCatalog } from './recipeCatalog.js';
import { getProductsByIds } from './productLookup.js';

// Customer history (/customers) and billing (/) are separate pages, so an
// "order again" is handed across in sessionStorage and picked up once the
// billing page has the shop's live pricing.
const STORAGE_KEY = 'shindraj_reorder';

/**
 * `bills` has one row per item and no order id -- the rows of one checkout
 * are written in a single insert, so they share `created_at`. That's the
 * order key; `order_date` is only a fallback for any row without it.
 */
export function groupBillsIntoOrders(rows) {
  const orders = new Map();
  for (const row of rows) {
    const key = row.created_at || row.order_date;
    if (!orders.has(key)) orders.set(key, { key, orderDate: row.order_date, rows: [], total: 0 });
    const order = orders.get(key);
    order.rows.push(row);
    order.total += Number(row.total) || 0;
  }
  return [...orders.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

function isProductRow(row) {
  return row.kind === 'product' || !!row.product_id;
}

// What was bought, without any of the old prices -- those get looked up
// fresh when the order is rebuilt.
function itemsFromRows(rows) {
  const items = [];
  const productQty = new Map();
  for (const row of rows) {
    if (isProductRow(row)) {
      const qty = Number(row.line_items?.[0]?.qty) || 1;
      productQty.set(row.product_id, (productQty.get(row.product_id) || 0) + qty);
    } else if (row.masala_type && row.quantity_kg) {
      items.push({ kind: 'custom', type: String(row.masala_type).toLowerCase(), qtyLabel: String(row.quantity_kg) });
    }
  }
  for (const [productId, qty] of productQty) items.push({ kind: 'product', productId, qty });
  return items;
}

export function stashReorder({ customer, order }) {
  const spec = {
    customer: { name: customer.name || '', phone: customer.phone || '', area: customer.area || '' },
    fromDate: order.orderDate,
    items: itemsFromRows(order.rows),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(spec));
  } catch {
    // sessionStorage unavailable -- the reorder just won't carry over.
  }
}

export function readReorder() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearReorder() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Turns a stashed reorder into cart items at this shop's current prices.
 * Ready-made products take today's price; custom masala goes back through
 * today's recipe pricing on the bill step. Anything no longer sold (product
 * deactivated, masala size removed) is skipped and counted.
 */
export async function resolveReorder(spec, { locationId, pricingConfig }) {
  const catalog = getRecipeCatalog(pricingConfig);
  const productIds = spec.items.filter((i) => i.kind === 'product').map((i) => i.productId);
  const products = await getProductsByIds(productIds, locationId);
  const byId = new Map(products.map((p) => [p.id, p]));

  const items = [];
  let skipped = 0;
  for (const it of spec.items) {
    if (it.kind === 'product') {
      const p = byId.get(it.productId);
      if (!p) {
        skipped += 1;
        continue;
      }
      items.push({
        id: crypto.randomUUID(),
        kind: 'product',
        productId: p.id,
        name: p.name_en,
        unit: p.unit,
        qty: it.qty,
        unitPrice: Number(p.price),
      });
    } else {
      const option = catalog[it.type]?.find((o) => o.qtyLabel === it.qtyLabel || o.qtyValue === Number(it.qtyLabel));
      if (!option) {
        skipped += 1;
        continue;
      }
      items.push({ id: crypto.randomUUID(), kind: 'custom', type: it.type, qtyLabel: option.qtyLabel, recipeKey: option.recipeKey });
    }
  }
  return { items, skipped };
}
