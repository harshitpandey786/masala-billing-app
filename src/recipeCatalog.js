import defaultConfig from '../data/pricing-config.json' with { type: 'json' };

export function getRecipeCatalog(config = defaultConfig) {
  const catalog = {};
  for (const key of Object.keys(config.recipes)) {
    const [type, ...qtyParts] = key.split('_');
    const qtyLabel = qtyParts.join('.');
    if (!catalog[type]) catalog[type] = [];
    catalog[type].push({ qtyLabel, qtyValue: Number(qtyLabel), recipeKey: key });
  }
  for (const options of Object.values(catalog)) {
    options.sort((a, b) => a.qtyValue - b.qtyValue);
  }
  return catalog;
}

export function recipeKeyFor(type, qtyLabel) {
  return `${type}_${qtyLabel.replace('.', '_')}`;
}

export function typeLabel(type) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function getAddonIngredientCodes(config = defaultConfig) {
  return config.likely_addon_ingredient_codes || [];
}
