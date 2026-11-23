import { supabase } from './supabaseClient.js';

// A freshly added shop (see AdminLocations.jsx) starts with none of its own
// ingredients, masala types, or recipes -- without this it would silently
// fall back to the bundled default pricing (data/pricing-config.json)
// instead of a real, editable price book, the same way the original
// multi-shop migration (docs/supabase-setup.md §9) forked one shared price
// list into an identical copy per shop. Picks the oldest other shop as the
// template. Best-effort: billing still works off the bundled fallback even
// if this fails partway, it just means the new shop isn't on live pricing
// yet, same fail-quiet rule as the rest of this app.
export async function seedShopPricing(newLocationId) {
  if (!supabase) return;

  try {
    const { data: template } = await supabase
      .from('locations')
      .select('id')
      .neq('id', newLocationId)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (!template) return;
    const srcId = template.id;

    const [ingredientsRes, masalaTypesRes, pricingSettingsRes, recipesRes] = await Promise.all([
      supabase.from('ingredients').select('*').eq('location_id', srcId),
      supabase.from('masala_types').select('*').eq('location_id', srcId),
      supabase.from('pricing_settings').select('*').eq('location_id', srcId).maybeSingle(),
      supabase.from('recipes').select('*').eq('location_id', srcId),
    ]);

    if (ingredientsRes.data?.length) {
      await supabase.from('ingredients').insert(
        ingredientsRes.data.map((i) => ({
          location_id: newLocationId,
          code: i.code,
          name_en: i.name_en,
          name_mr: i.name_mr,
          price_per_kg: i.price_per_kg,
          price_per_piece: i.price_per_piece,
          is_addon: i.is_addon,
        }))
      );
    }

    if (masalaTypesRes.data?.length) {
      await supabase.from('masala_types').insert(
        masalaTypesRes.data.map((m) => ({
          location_id: newLocationId,
          key: m.key,
          label_en: m.label_en,
          label_mr: m.label_mr,
          sort_order: m.sort_order,
        }))
      );
    }

    if (pricingSettingsRes.data) {
      await supabase.from('pricing_settings').insert({
        location_id: newLocationId,
        making_charge_per_kg: pricingSettingsRes.data.making_charge_per_kg,
      });
    }

    if (recipesRes.data?.length) {
      const { data: newRecipes } = await supabase
        .from('recipes')
        .insert(
          recipesRes.data.map((r) => ({
            location_id: newLocationId,
            masala_type: r.masala_type,
            qty_label: r.qty_label,
            qty_value: r.qty_value,
            fixed_making_charge: r.fixed_making_charge,
            sort_order: r.sort_order,
          }))
        )
        .select('id, masala_type, qty_label');

      if (newRecipes?.length) {
        const recipeIdByKey = new Map(newRecipes.map((r) => [`${r.masala_type}::${r.qty_label}`, r.id]));
        const oldRecipeById = new Map(recipesRes.data.map((r) => [r.id, r]));
        const oldRecipeIds = recipesRes.data.map((r) => r.id);

        const { data: lines } = await supabase.from('recipe_lines').select('*').in('recipe_id', oldRecipeIds);
        const newLines = (lines || [])
          .map((l) => {
            const oldRecipe = oldRecipeById.get(l.recipe_id);
            const newRecipeId = oldRecipe && recipeIdByKey.get(`${oldRecipe.masala_type}::${oldRecipe.qty_label}`);
            if (!newRecipeId) return null;
            return {
              recipe_id: newRecipeId,
              ingredient_code: l.ingredient_code,
              unit: l.unit,
              default_qty: l.default_qty,
              is_core_chili: l.is_core_chili,
              row_order: l.row_order,
            };
          })
          .filter(Boolean);
        if (newLines.length) await supabase.from('recipe_lines').insert(newLines);
      }
    }
  } catch (err) {
    console.error('Failed to seed pricing for new shop -- it will use the bundled default pricing until this is fixed', err);
  }
}
