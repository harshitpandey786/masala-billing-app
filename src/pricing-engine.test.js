import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceRecipe } from './pricing-engine.js';

test('malvani_1_25: full base-recipe totals match hand calculation', () => {
  const result = priceRecipe('malvani_1_25');

  assert.equal(result.totalWeightG, 2285); // sum of all gram-unit qtys, JF pieces excluded
  assert.equal(result.ingredientsSubtotal, 2033); // 2032.5 raw, AKDC's 212.5 rounds up to 213
  assert.equal(result.makingCharge, 229); // 2285g -> 2.285kg * Rs100/kg = 228.5, rounds up to 229
  assert.equal(result.total, 2262);
  assert.equal(result.lineItems.length, 29);
});

test('gram->kg conversion: AKDC 250g @ Rs850/kg = Rs212.50, rounded to Rs213', () => {
  const result = priceRecipe('malvani_1_25');
  const akdc = result.lineItems.find((l) => l.code === 'AKDC');
  assert.equal(akdc.unit, 'g');
  assert.equal(akdc.qty, 250);
  assert.equal(akdc.amount, 213); // whole-rupee rounding, confirmed by client
});

test('JF is priced per piece, not per gram, across all three recipes', () => {
  const malvani125 = priceRecipe('malvani_1_25');
  const malvani3 = priceRecipe('malvani_3');
  const ghati125 = priceRecipe('ghati_1_25');

  const jf125 = malvani125.lineItems.find((l) => l.code === 'JF');
  assert.equal(jf125.unit, 'piece');
  assert.equal(jf125.qty, 2);
  assert.equal(jf125.amount, 30); // 2 pieces * Rs15/piece

  const jf3 = malvani3.lineItems.find((l) => l.code === 'JF');
  assert.equal(jf3.qty, 6);
  assert.equal(jf3.amount, 90); // 6 pieces * Rs15/piece

  const jfGhati = ghati125.lineItems.find((l) => l.code === 'JF');
  assert.equal(jfGhati.qty, 2);
  assert.equal(jfGhati.amount, 30);

  // JF weight must not leak into the kg-based making charge
  for (const r of [malvani125, malvani3, ghati125]) {
    const jf = r.lineItems.find((l) => l.code === 'JF');
    assert.ok(!Number.isNaN(r.totalWeightG));
    assert.equal(jf.unit, 'piece');
  }
});

test('making charge for ghati_1_25 and malvani_3 base recipes', () => {
  const ghati125 = priceRecipe('ghati_1_25');
  assert.equal(ghati125.totalWeightG, 5055);
  assert.equal(ghati125.makingCharge, 506); // 505.5 raw, rounds up to 506

  const malvani3 = priceRecipe('malvani_3');
  assert.equal(malvani3.totalWeightG, 5860);
  assert.equal(malvani3.makingCharge, 586); // exact, no rounding needed
});

test('overriding an existing ingredient quantity recalculates its amount, weight and making charge', () => {
  const base = priceRecipe('malvani_1_25');
  const overridden = priceRecipe('malvani_1_25', { overrides: { GTDC: 750 } });

  const gtdcBase = base.lineItems.find((l) => l.code === 'GTDC');
  const gtdcNew = overridden.lineItems.find((l) => l.code === 'GTDC');
  assert.equal(gtdcBase.amount, 200);
  assert.equal(gtdcNew.amount, 300); // 750g -> 0.75kg * Rs400/kg

  assert.equal(overridden.totalWeightG, base.totalWeightG + 250);
  assert.equal(overridden.makingCharge, 254); // 2535g -> 253.5 raw, rounds up to 254
  assert.equal(overridden.ingredientsSubtotal, base.ingredientsSubtotal + 100);
  assert.equal(overridden.total, 2387);

  // line count is unchanged -- overrides adjust existing rows, they don't add new ones
  assert.equal(overridden.lineItems.length, base.lineItems.length);
});

test('adding a new chili/ingredient line appends a priced row and folds into weight + making charge', () => {
  const base = priceRecipe('malvani_1_25');
  const withAddon = priceRecipe('malvani_1_25', {
    additions: [{ code: 'GPDC', qty: 300 }],
  });

  assert.equal(withAddon.lineItems.length, base.lineItems.length + 1);
  // Added chilies land right after the 3 core chili rows (GTDC/ABDC/AKDC), not at the end.
  assert.deepEqual(
    withAddon.lineItems.map((l) => l.code).slice(0, 5),
    ['GTDC', 'ABDC', 'AKDC', 'GPDC', 'DN']
  );
  const gpdc = withAddon.lineItems[3];
  assert.equal(gpdc.code, 'GPDC');
  assert.equal(gpdc.amount, 108); // 300g -> 0.3kg * Rs360/kg

  assert.equal(withAddon.totalWeightG, base.totalWeightG + 300);
  assert.equal(withAddon.makingCharge, 259); // 2585g -> 258.5 raw, rounds up to 259
  assert.equal(withAddon.ingredientsSubtotal, base.ingredientsSubtotal + 108);
  assert.equal(withAddon.total, 2400);
});

test('multiple added chilies stay in the order they were added, all after the core chili rows', () => {
  const result = priceRecipe('malvani_1_25', {
    additions: [
      { code: 'GPDC', qty: 300 },
      { code: 'RPDC', qty: 150 },
    ],
  });
  assert.deepEqual(
    result.lineItems.map((l) => l.code).slice(0, 6),
    ['GTDC', 'ABDC', 'AKDC', 'GPDC', 'RPDC', 'DN']
  );
});

test('a zero or negative quantity addition is skipped rather than priced', () => {
  const result = priceRecipe('malvani_1_25', { additions: [{ code: 'GPDC', qty: 0 }] });
  assert.equal(result.lineItems.some((l) => l.code === 'GPDC'), false);
});

test('unknown recipe key throws', () => {
  assert.throws(() => priceRecipe('malvani_9'), /Unknown recipe key/);
});

test('overriding a code that is not part of the recipe throws', () => {
  assert.throws(
    () => priceRecipe('malvani_1_25', { overrides: { SKV: 100 } }),
    /Override\(s\) for code\(s\) not present/
  );
});

test('adding an ingredient with no matching rate card entry throws', () => {
  assert.throws(
    () => priceRecipe('malvani_1_25', { additions: [{ code: 'NOPE', qty: 10 }] }),
    /Unknown ingredient code/
  );
});
