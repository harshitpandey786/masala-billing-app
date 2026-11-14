// A small, consistent color per masala type -- shared by the order cart tile
// and the bill/order tables, so "Malvani" always reads the same color
// wherever it shows up. The two known blends get deliberate, meaningful
// colors (Malvani keeps the shop's own brand red, Ghati gets a turmeric
// amber); anything else (a future type, or a ready-made product that ends up
// here) falls back to a deterministic pick from the same utility ramps the
// avatar colors use, so it never clashes with the rest of the palette.
const KNOWN = {
  malvani: { bg: 'bg-brand-secondary', text: 'text-brand-secondary', dot: 'bg-brand-solid' },
  ghati: { bg: 'bg-utility-orange-100', text: 'text-utility-orange-700', dot: 'bg-utility-orange-500' },
};

const FALLBACK_PALETTE = [
  { bg: 'bg-utility-blue-100', text: 'text-utility-blue-700', dot: 'bg-utility-blue-500' },
  { bg: 'bg-utility-purple-100', text: 'text-utility-purple-700', dot: 'bg-utility-purple-500' },
  { bg: 'bg-utility-pink-100', text: 'text-utility-pink-700', dot: 'bg-utility-pink-500' },
  { bg: 'bg-utility-indigo-100', text: 'text-utility-indigo-700', dot: 'bg-utility-indigo-500' },
];

export function masalaTypeColorFor(type) {
  const key = (type || '').toLowerCase();
  if (KNOWN[key]) return KNOWN[key];

  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}
