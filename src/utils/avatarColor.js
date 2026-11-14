// Deterministic avatar color per person, from the same utility color ramps
// the Badge components already use -- so a customer always gets the same
// color across the app (Customer Lookup, Customer Detail, Top Customers),
// and the palette never introduces a hue the rest of the UI doesn't have.
const PALETTE = [
  { bg: 'bg-utility-blue-100', text: 'text-utility-blue-700' },
  { bg: 'bg-utility-purple-100', text: 'text-utility-purple-700' },
  { bg: 'bg-utility-orange-100', text: 'text-utility-orange-700' },
  { bg: 'bg-utility-pink-100', text: 'text-utility-pink-700' },
  { bg: 'bg-utility-indigo-100', text: 'text-utility-indigo-700' },
  { bg: 'bg-brand-100', text: 'text-brand-700' },
];

export function avatarColorFor(seed) {
  const str = seed || '?';
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
