// GST tax breakup for a bill's already-rounded total. The total the
// customer pays never changes -- this only itemizes how much of it is tax,
// for a GST-registered shop's invoice. Assumes an intra-state sale (CGST +
// SGST split), the common case for a single-city shop; see
// docs/supabase-setup.md §12c.
export function computeGstBreakup(total, ratePct) {
  const rate = Number(ratePct) || 0;
  if (!rate || !total) return { taxableValue: Number(total) || 0, cgst: 0, sgst: 0, totalTax: 0 };
  const taxableValue = total / (1 + rate / 100);
  const totalTax = total - taxableValue;
  const round2 = (n) => Math.round(n * 100) / 100;
  return {
    taxableValue: round2(taxableValue),
    cgst: round2(totalTax / 2),
    sgst: round2(totalTax / 2),
    totalTax: round2(totalTax),
  };
}
