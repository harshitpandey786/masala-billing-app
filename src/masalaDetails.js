// Step 2 is just a free note on what the customer asked for on one custom
// masala. Recorded and printed on the bill; the price only changes through
// the proforma edits the counter makes -- quantity, and now a per-row price
// the counter can negotiate directly (see pricing-engine.js's
// priceOverrides, used by BillGenerator.jsx).
export const emptyDetails = () => ({ note: '' });

export function hasDetails(details) {
  return Boolean(details?.note?.trim());
}

// One short line per detail -- today that's just the note, if any.
export function detailsParts(details, t) {
  return hasDetails(details) ? [details.note.trim()] : [];
}
