// Client step 2, "get into the details": what the customer asked for on one
// custom masala. Recorded and printed on the bill; the price only changes
// through the proforma edits the counter makes from it.
// `chilliFactor` scales the recipe's core chilli rows (GTDC/ABDC/AKDC) when
// the level is applied on the proforma. Medium is the recipe as written.
export const SPICE_LEVELS = [
  { id: 'mild', labelKey: 'spiceMild', chilliFactor: 0.75 },
  { id: 'medium', labelKey: 'spiceMedium', chilliFactor: 1 },
  { id: 'hot', labelKey: 'spiceHot', chilliFactor: 1.25 },
  { id: 'extra_hot', labelKey: 'spiceExtraHot', chilliFactor: 1.5 },
];

// New proforma overrides with the recipe's chilli rows set for `levelId`,
// rounded to the gram. Medium removes the chilli overrides so those rows go
// back to the recipe amount; other rows' overrides are left alone.
export function applySpiceLevel(overrides, recipe, chilliCodes, levelId) {
  const level = SPICE_LEVELS.find((l) => l.id === levelId);
  if (!level || !recipe) return overrides;
  const next = { ...overrides };
  for (const ing of recipe) {
    if (!chilliCodes.includes(ing.code)) continue;
    if (level.chilliFactor === 1) delete next[ing.code];
    else next[ing.code] = Math.round(ing.default_qty * level.chilliFactor);
  }
  return next;
}

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
