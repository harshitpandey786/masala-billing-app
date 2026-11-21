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

// Step 2 is just a free note on what the customer asked for -- spice level
// is instead set directly on the proforma (see applySpiceLevel above, used
// by BillGenerator.jsx), since that's the screen that actually prices it.
export const emptyDetails = () => ({ note: '' });

export function hasDetails(details) {
  return Boolean(details?.note?.trim());
}

// One short line per detail -- today that's just the note, if any.
export function detailsParts(details, t) {
  return hasDetails(details) ? [details.note.trim()] : [];
}
