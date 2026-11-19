// One tap on a product adds a sensible amount for its unit; the -/+ then
// nudges by a finer step for things sold by weight.
export const TAP_QTY = { piece: 1, kg: 1, g: 100 };
export const STEP_QTY = { piece: 1, kg: 0.25, g: 50 };
export const roundQty = (n) => Math.round(n * 1000) / 1000;

export function unitAbbrev(unit) {
  if (unit === 'piece') return 'pcs';
  if (unit === 'kg') return 'kg';
  return 'g';
}

// Tapping a product already in the order adds one more of it instead of a
// second line.
export function addProductItem(orderItems, product) {
  const add = TAP_QTY[product.unit] ?? 1;
  const existing = orderItems.find((i) => i.kind === 'product' && i.productId === product.id);
  if (existing) {
    return orderItems.map((i) => (i.id === existing.id ? { ...i, qty: roundQty(i.qty + add) } : i));
  }
  return [
    ...orderItems,
    {
      id: crypto.randomUUID(),
      kind: 'product',
      productId: product.id,
      name: product.name_en,
      unit: product.unit,
      qty: add,
      unitPrice: Number(product.price),
    },
  ];
}
