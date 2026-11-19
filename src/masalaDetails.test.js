import { test } from 'node:test';
import assert from 'node:assert/strict';
import pricingConfig from '../data/pricing-config.json' with { type: 'json' };
import { applySpiceLevel } from './masalaDetails.js';
import { priceRecipe } from './pricing-engine.js';

const recipe = pricingConfig.recipes.malvani_1_25;
const chilli = pricingConfig.core_chili_row_codes;

test('mild and hot scale only the chilli rows of the recipe', () => {
  assert.deepEqual(applySpiceLevel({}, recipe, chilli, 'mild'), { GTDC: 375, ABDC: 375, AKDC: 188 });
  assert.deepEqual(applySpiceLevel({}, recipe, chilli, 'hot'), { GTDC: 625, ABDC: 625, AKDC: 313 });
  assert.deepEqual(applySpiceLevel({}, recipe, chilli, 'extra_hot'), { GTDC: 750, ABDC: 750, AKDC: 375 });
});

test('medium puts the chilli rows back to the recipe and keeps other edits', () => {
  const edited = { GTDC: 625, ABDC: 625, AKDC: 313, HLD: 70 };
  assert.deepEqual(applySpiceLevel(edited, recipe, chilli, 'medium'), { HLD: 70 });
});

test('an unknown level changes nothing', () => {
  const edited = { HLD: 70 };
  assert.equal(applySpiceLevel(edited, recipe, chilli, 'volcanic'), edited);
});

test('hotter costs more than medium, milder costs less', () => {
  const total = (level) =>
    priceRecipe('malvani_1_25', { overrides: applySpiceLevel({}, recipe, chilli, level), config: pricingConfig }).total;
  assert.ok(total('mild') < total('medium'));
  assert.ok(total('medium') < total('hot'));
  assert.ok(total('hot') < total('extra_hot'));
});
