// Client step 2, "get into the details": what the customer asked for on one
// custom masala. Recorded and printed on the bill; the price only changes
// through the proforma edits the counter makes from it.
export const SPICE_LEVELS = [
  { id: 'mild', labelKey: 'spiceMild' },
  { id: 'medium', labelKey: 'spiceMedium' },
  { id: 'hot', labelKey: 'spiceHot' },
  { id: 'extra_hot', labelKey: 'spiceExtraHot' },
];

export const emptyDetails = () => ({ spice: null, extra: [], without: [], note: '' });

export function hasDetails(details) {
  return Boolean(details && (details.spice || details.extra?.length || details.without?.length || details.note?.trim()));
}

// One short line per detail, e.g. ["Spice: Hot", "Extra: GTDC, KS", ...].
export function detailsParts(details, t) {
  if (!hasDetails(details)) return [];
  const parts = [];
  const spice = SPICE_LEVELS.find((s) => s.id === details.spice);
  if (spice) parts.push(`${t('spiceLabelShort')}: ${t(spice.labelKey)}`);
  if (details.extra?.length) parts.push(`${t('extraShort')}: ${details.extra.join(', ')}`);
  if (details.without?.length) parts.push(`${t('withoutShort')}: ${details.without.join(', ')}`);
  if (details.note?.trim()) parts.push(details.note.trim());
  return parts;
}
