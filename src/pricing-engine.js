import defaultConfig from '../data/pricing-config.json' with { type: 'json' };

// Client-confirmed: all monetary amounts round to the nearest whole rupee.
function roundRupee(n) {
  return Math.round(n);
}

function priceLine(code, qty, unit, rateCard) {
  const rate = rateCard[code];
  if (!rate) {
    throw new Error(`Unknown ingredient code: ${code}`);
  }
  if (unit === 'piece') {
    if (rate.price_per_piece == null) {
      throw new Error(`Ingredient ${code} has no per-piece rate`);
    }
    return { code, qty, unit, rate: rate.price_per_piece, amount: roundRupee(qty * rate.price_per_piece) };
  }
  if (unit === 'g') {
    if (rate.price_per_kg == null) {
      throw new Error(`Ingredient ${code} has no per-kg rate`);
    }
    return { code, qty, unit, rate: rate.price_per_kg, amount: roundRupee((qty / 1000) * rate.price_per_kg) };
  }
  throw new Error(`Unsupported unit "${unit}" for ingredient ${code}`);
}

/**
 * @param {string} recipeKey - e.g. 'malvani_1_25'
 * @param {object} [options]
 * @param {Object<string, number>} [options.overrides] - qty overrides keyed by ingredient code, for rows already in the recipe
 * @param {Array<{code: string, qty: number, unit?: 'g'|'piece'}>} [options.additions] - new ingredient rows not in the base recipe (e.g. extra chilies)
 * @param {object} [options.config] - pricing config to use instead of the bundled default (mainly for tests)
 */
export function priceRecipe(recipeKey, options = {}) {
  const { overrides = {}, additions = [], config = defaultConfig } = options;

  const recipe = config.recipes[recipeKey];
  if (!recipe) {
    throw new Error(`Unknown recipe key: ${recipeKey}`);
  }
  const rateCard = config.rate_card;

  const unknownOverrides = Object.keys(overrides).filter(
    (code) => !recipe.some((ing) => ing.code === code)
  );
  if (unknownOverrides.length > 0) {
    throw new Error(
      `Override(s) for code(s) not present in recipe "${recipeKey}": ${unknownOverrides.join(', ')}`
    );
  }

  const additionLines = additions
    .filter((addition) => addition.qty != null && addition.qty > 0)
    .map((addition) => priceLine(addition.code, addition.qty, addition.unit || 'g', rateCard));

  // Added chilies go right after the core chili rows (GTDC/ABDC/AKDC), not at the
  // end of the bill -- matches the physical prep sequence the row order must follow.
  const coreChiliCodes = config.core_chili_row_codes || [];
  const lastCoreChiliCode = coreChiliCodes[coreChiliCodes.length - 1];

  const lineItems = [];
  let additionsInserted = additionLines.length === 0;
  for (const ing of recipe) {
    const qty = overrides[ing.code] != null ? overrides[ing.code] : ing.default_qty;
    lineItems.push(priceLine(ing.code, qty, ing.unit, rateCard));
    if (!additionsInserted && ing.code === lastCoreChiliCode) {
      lineItems.push(...additionLines);
      additionsInserted = true;
    }
  }
  if (!additionsInserted) {
    lineItems.push(...additionLines);
  }

  const ingredientsSubtotal = lineItems.reduce((sum, line) => sum + line.amount, 0);
  const totalWeightG = lineItems.reduce((sum, line) => sum + (line.unit === 'g' ? line.qty : 0), 0);
  const makingCharge = roundRupee((totalWeightG / 1000) * config.making_charge_per_kg);
  const total = ingredientsSubtotal + makingCharge;

  return { recipeKey, lineItems, totalWeightG, ingredientsSubtotal, makingCharge, total };
}
