import { supabase } from './supabaseClient.js';
import defaultConfig from '../data/pricing-config.json' with { type: 'json' };

// Reshapes the live Supabase pricing tables into the exact same shape as
// data/pricing-config.json, so pricing-engine.js and recipeCatalog.js (which
// already accept a `config` override, defaulting to the bundled file) don't
// need to know or care whether the data came from Supabase or disk. Falls
// back to the bundled file whenever Supabase isn't configured or the fetch
// fails, same resilience rule as the rest of this app -- a flaky connection
// should never stop an operator from billing a customer, just mean the
// prices are whatever shipped in the last deploy instead of the latest edit.
//
// `locationId` scopes every table to one shop -- pricing is fully
// independent per shop (see docs/supabase-setup.md §9), so there is no
// business-wide config anymore, only each shop's own.
export async function fetchPricingConfig(locationId) {
  if (!supabase || !locationId) return defaultConfig;

  try {
    const [ingredientsRes, typesRes, recipesRes, settingsRes] = await Promise.all([
      supabase.from('ingredients').select('*').eq('location_id', locationId),
      supabase.from('masala_types').select('*').eq('location_id', locationId).order('sort_order'),
      supabase.from('recipes').select('*').eq('location_id', locationId).order('sort_order'),
      supabase.from('pricing_settings').select('*').eq('location_id', locationId).maybeSingle(),
    ]);

    const error = ingredientsRes.error || typesRes.error || recipesRes.error || settingsRes.error;
    if (error || !ingredientsRes.data?.length || !recipesRes.data?.length) {
      console.error('Failed to fetch live pricing, falling back to bundled config', error);
      return defaultConfig;
    }

    const recipeIds = recipesRes.data.map((r) => r.id);
    const linesRes = await supabase
      .from('recipe_lines')
      .select('*')
      .in('recipe_id', recipeIds)
      .order('recipe_id')
      .order('row_order');
    if (linesRes.error) {
      console.error('Failed to fetch live pricing, falling back to bundled config', linesRes.error);
      return defaultConfig;
    }

    const rate_card = {};
    for (const ing of ingredientsRes.data) {
      rate_card[ing.code] = {
        price_per_kg: ing.price_per_kg != null ? Number(ing.price_per_kg) : null,
        price_per_piece: ing.price_per_piece != null ? Number(ing.price_per_piece) : null,
      };
    }

    const masala_types = {};
    for (const t of typesRes.data) {
      masala_types[t.key] = { label_en: t.label_en, label_mr: t.label_mr };
    }

    const recipeKeyOf = (r) => `${r.masala_type}_${String(r.qty_label).replace(/\./g, '_')}`;
    const recipesById = new Map(recipesRes.data.map((r) => [r.id, r]));

    const recipes = {};
    const fixed_making_charges = {};
    for (const r of recipesRes.data) {
      recipes[recipeKeyOf(r)] = [];
      if (r.fixed_making_charge != null) {
        fixed_making_charges[recipeKeyOf(r)] = Number(r.fixed_making_charge);
      }
    }

    const coreChiliCodes = new Set();
    for (const line of linesRes.data) {
      const recipe = recipesById.get(line.recipe_id);
      if (!recipe) continue;
      recipes[recipeKeyOf(recipe)].push({
        code: line.ingredient_code,
        unit: line.unit,
        default_qty: Number(line.default_qty),
      });
      if (line.is_core_chili) coreChiliCodes.add(line.ingredient_code);
    }

    const likely_addon_ingredient_codes = ingredientsRes.data.filter((i) => i.is_addon).map((i) => i.code);
    const making_charge_per_kg = Number(
      settingsRes.data?.making_charge_per_kg ?? defaultConfig.making_charge_per_kg
    );

    return {
      business_info: defaultConfig.business_info,
      rate_card,
      recipes,
      making_charge_per_kg,
      fixed_making_charges,
      likely_addon_ingredient_codes,
      core_chili_row_codes: [...coreChiliCodes],
      masala_types,
    };
  } catch (err) {
    console.error('Failed to fetch live pricing, falling back to bundled config', err);
    return defaultConfig;
  }
}
