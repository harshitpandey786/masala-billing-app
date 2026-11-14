import { useEffect, useState } from 'react';
import { CheckCircle, ChevronDown, ChevronRight, Plus, Trash01, X } from '@untitledui/icons';
import { BadgeWithIcon } from '@/components/base/badges/badges';
import { Button } from '@/components/base/buttons/button';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Input } from '@/components/base/input/input';
import { NativeSelect } from '@/components/base/select/select-native';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

const th = 'border-b border-secondary bg-secondary px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-tertiary';
const td = 'border-b border-secondary px-4 py-3 align-middle text-sm text-tertiary';

function SubHeader({ title, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-md font-semibold text-primary">{title}</h3>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function AddPanel({ children, error }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-secondary p-4 ring-1 ring-secondary ring-inset">
      <div className="flex flex-wrap items-end gap-3">{children}</div>
      {error && <p className="text-sm text-error-primary">{error}</p>}
    </div>
  );
}

// Owner/shop-editable pricing: ingredient rates, masala types, and their
// recipes (ingredient lists + quantities), all stored in Supabase so changes
// here take effect on the next bill without a code deploy. Pricing is fully
// independent per shop (see docs/supabase-setup.md §9) -- every table is
// scoped to `locationId`, so this component always edits exactly one shop's
// numbers, whether it's rendered inside the owner's /admin (any shop, picked
// from a selector) or a shop's own /shop-admin (always its own id). Same
// security model as the rest of /admin -- the password gates the UI, not the
// database (anon key has write access to these tables, same tradeoff already
// documented for /admin's other data).
export default function AdminPricing({ locationId }) {
  const { t } = useLanguage();
  const [ingredients, setIngredients] = useState([]);
  const [masalaTypes, setMasalaTypes] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [recipeLines, setRecipeLines] = useState([]);
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(supabase && locationId ? 'loading' : 'not_configured');
  const [savedFlash, setSavedFlash] = useState('');

  async function loadAll() {
    if (!supabase || !locationId) return;
    setStatus('loading');
    const [i, m, r, s] = await Promise.all([
      supabase.from('ingredients').select('*').eq('location_id', locationId).order('code'),
      supabase.from('masala_types').select('*').eq('location_id', locationId).order('sort_order'),
      supabase.from('recipes').select('*').eq('location_id', locationId).order('sort_order'),
      supabase.from('pricing_settings').select('*').eq('location_id', locationId).maybeSingle(),
    ]);
    if (i.error || m.error || r.error || s.error) {
      console.error('Failed to load pricing data', i.error || m.error || r.error || s.error);
      setStatus('error');
      return;
    }
    const recipeIds = (r.data || []).map((row) => row.id);
    const l = recipeIds.length
      ? await supabase.from('recipe_lines').select('*').in('recipe_id', recipeIds).order('recipe_id').order('row_order')
      : { data: [] };
    if (l.error) {
      console.error('Failed to load pricing data', l.error);
      setStatus('error');
      return;
    }
    setIngredients(i.data || []);
    setMasalaTypes(m.data || []);
    setRecipes(r.data || []);
    setRecipeLines(l.data || []);
    setSettings(s.data);
    setStatus('ready');
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  function flash(label) {
    setSavedFlash(label);
    setTimeout(() => setSavedFlash(''), 1500);
  }

  if (status === 'not_configured') return null;

  return (
    <section className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
      <div className="flex items-center justify-between gap-4 border-b border-secondary px-4 py-5 md:px-6">
        <h2 className="text-lg font-semibold text-primary">{t('pricingManagerTitle')}</h2>
        {savedFlash && (
          <BadgeWithIcon type="pill-color" color="success" size="md" iconLeading={CheckCircle}>
            {savedFlash}
          </BadgeWithIcon>
        )}
      </div>

      <div className="flex flex-col gap-8 px-4 py-5 md:px-6 md:py-6">
        {status === 'loading' && <p className="text-sm text-tertiary">{t('loadingResults')}</p>}
        {status === 'error' && <p className="text-sm text-error-primary">{t('loadError')}</p>}

        {status === 'ready' && (
          <>
            <MakingChargeSetting locationId={locationId} settings={settings} onSaved={() => flash(t('saved'))} />

            <IngredientRateCard
              locationId={locationId}
              ingredients={ingredients}
              onChanged={loadAll}
              onSaved={() => flash(t('saved'))}
            />

            <RecipesSection
              locationId={locationId}
              masalaTypes={masalaTypes}
              recipes={recipes}
              recipeLines={recipeLines}
              ingredients={ingredients}
              onChanged={loadAll}
              onSaved={() => flash(t('saved'))}
            />
          </>
        )}
      </div>
    </section>
  );
}

function MakingChargeSetting({ locationId, settings, onSaved }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(settings?.making_charge_per_kg ?? 0);
  const [saving, setSaving] = useState(false);
  const dirty = Number(value) !== Number(settings?.making_charge_per_kg ?? 0);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('pricing_settings')
      .update({ making_charge_per_kg: Number(value) })
      .eq('location_id', locationId);
    setSaving(false);
    if (error) {
      console.error('Failed to save making charge setting', error);
      return;
    }
    onSaved();
  }

  return (
    <div className="flex flex-col gap-3">
      <SubHeader title={t('makingChargePerKgLabel')} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-tertiary">₹</span>
        <Input
          aria-label={t('makingChargePerKgLabel')}
          type="number"
          size="sm"
          value={String(value ?? '')}
          onChange={setValue}
          className="w-28"
        />
        {dirty && (
          <Button size="sm" color="secondary" onClick={save} isLoading={saving}>
            {t('save')}
          </Button>
        )}
      </div>
      <p className="text-sm text-tertiary">{t('makingChargePerKgHint')}</p>
    </div>
  );
}

function IngredientRateCard({ locationId, ingredients, onChanged, onSaved }) {
  const { t } = useLanguage();
  const [edits, setEdits] = useState({});
  const [savingCode, setSavingCode] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIng, setNewIng] = useState({
    code: '',
    name_en: '',
    name_mr: '',
    unitType: 'kg',
    price: '',
    is_addon: false,
  });
  const [addError, setAddError] = useState('');

  function fieldFor(ing, field) {
    return edits[ing.code]?.[field] !== undefined ? edits[ing.code][field] : ing[field] ?? '';
  }

  function setField(code, field, value) {
    setEdits((prev) => ({ ...prev, [code]: { ...prev[code], [field]: value } }));
  }

  function isDirty(ing) {
    const e = edits[ing.code];
    if (!e) return false;
    return Object.entries(e).some(([k, v]) => String(v) !== String(ing[k] ?? ''));
  }

  async function saveRow(ing) {
    const e = edits[ing.code];
    if (!e) return;
    setSavingCode(ing.code);
    const payload = {};
    if (e.name_en !== undefined) payload.name_en = e.name_en || null;
    if (e.name_mr !== undefined) payload.name_mr = e.name_mr || null;
    if (e.price_per_kg !== undefined) payload.price_per_kg = e.price_per_kg === '' ? null : Number(e.price_per_kg);
    if (e.price_per_piece !== undefined) {
      payload.price_per_piece = e.price_per_piece === '' ? null : Number(e.price_per_piece);
    }
    if (e.is_addon !== undefined) payload.is_addon = !!e.is_addon;
    const { error } = await supabase
      .from('ingredients')
      .update(payload)
      .eq('location_id', locationId)
      .eq('code', ing.code);
    setSavingCode(null);
    if (error) {
      console.error('Failed to save ingredient', error);
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[ing.code];
      return next;
    });
    onChanged();
    onSaved();
  }

  async function addIngredient() {
    setAddError('');
    const code = newIng.code.trim();
    if (!code) {
      setAddError(t('pricingCodeRequired'));
      return;
    }
    if (!newIng.price || Number(newIng.price) <= 0) {
      setAddError(t('pricingPriceRequired'));
      return;
    }
    const { error } = await supabase.from('ingredients').insert({
      location_id: locationId,
      code,
      name_en: newIng.name_en || null,
      name_mr: newIng.name_mr || null,
      price_per_kg: newIng.unitType === 'kg' ? Number(newIng.price) : null,
      price_per_piece: newIng.unitType === 'piece' ? Number(newIng.price) : null,
      is_addon: newIng.is_addon,
    });
    if (error) {
      setAddError(error.message);
      return;
    }
    setNewIng({ code: '', name_en: '', name_mr: '', unitType: 'kg', price: '', is_addon: false });
    setShowAddForm(false);
    onChanged();
    onSaved();
  }

  return (
    <div className="flex flex-col gap-3">
      <SubHeader
        title={t('ingredientRateCardTitle')}
        actions={
          <Button
            size="sm"
            color="secondary"
            iconLeading={showAddForm ? X : Plus}
            onClick={() => setShowAddForm((v) => !v)}
          >
            {showAddForm ? t('cancel') : t('addIngredient')}
          </Button>
        }
      />

      {showAddForm && (
        <AddPanel error={addError}>
          <Input
            size="sm"
            label={t('tableCode')}
            value={newIng.code}
            onChange={(v) => setNewIng({ ...newIng, code: v.toUpperCase() })}
            className="w-28"
          />
          <Input
            size="sm"
            label={t('tableNameEn')}
            value={newIng.name_en}
            onChange={(v) => setNewIng({ ...newIng, name_en: v })}
            className="w-44"
          />
          <Input
            size="sm"
            label={t('tableNameMr')}
            value={newIng.name_mr}
            onChange={(v) => setNewIng({ ...newIng, name_mr: v })}
            className="w-44"
          />
          <NativeSelect
            size="sm"
            aria-label={t('tablePricePerKg')}
            value={newIng.unitType}
            onChange={(e) => setNewIng({ ...newIng, unitType: e.target.value })}
            className="w-40"
            options={[
              { value: 'kg', label: t('tablePricePerKg') },
              { value: 'piece', label: t('tablePricePerPiece') },
            ]}
          />
          <Input
            size="sm"
            type="number"
            placeholder="₹"
            aria-label="₹"
            value={newIng.price}
            onChange={(v) => setNewIng({ ...newIng, price: v })}
            className="w-24"
          />
          <Checkbox
            label={t('tableAddon')}
            isSelected={newIng.is_addon}
            onChange={(checked) => setNewIng({ ...newIng, is_addon: checked })}
            className="pb-2.5"
          />
          <Button size="sm" iconLeading={Plus} onClick={addIngredient}>
            {t('addItem')}
          </Button>
        </AddPanel>
      )}

      <div className="overflow-x-auto rounded-lg ring-1 ring-secondary ring-inset">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>{t('tableCode')}</th>
              <th className={th}>{t('tableNameEn')}</th>
              <th className={th}>{t('tableNameMr')}</th>
              <th className={th}>{t('tablePricePerKg')}</th>
              <th className={th}>{t('tablePricePerPiece')}</th>
              <th className={th}>{t('tableAddon')}</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => (
              <tr key={ing.code} className="hover:bg-secondary">
                <td className={`${td} font-medium text-primary`}>{ing.code}</td>
                <td className={td}>
                  <Input
                    size="sm"
                    aria-label={t('tableNameEn')}
                    value={String(fieldFor(ing, 'name_en'))}
                    onChange={(v) => setField(ing.code, 'name_en', v)}
                    className="min-w-36"
                  />
                </td>
                <td className={td}>
                  <Input
                    size="sm"
                    aria-label={t('tableNameMr')}
                    value={String(fieldFor(ing, 'name_mr'))}
                    onChange={(v) => setField(ing.code, 'name_mr', v)}
                    className="min-w-36"
                  />
                </td>
                <td className={td}>
                  <Input
                    size="sm"
                    type="number"
                    aria-label={t('tablePricePerKg')}
                    value={String(fieldFor(ing, 'price_per_kg'))}
                    onChange={(v) => setField(ing.code, 'price_per_kg', v)}
                    className="w-24"
                  />
                </td>
                <td className={td}>
                  <Input
                    size="sm"
                    type="number"
                    aria-label={t('tablePricePerPiece')}
                    value={String(fieldFor(ing, 'price_per_piece'))}
                    onChange={(v) => setField(ing.code, 'price_per_piece', v)}
                    className="w-24"
                  />
                </td>
                <td className={td}>
                  <Checkbox
                    aria-label={t('tableAddon')}
                    isSelected={!!fieldFor(ing, 'is_addon')}
                    onChange={(checked) => setField(ing.code, 'is_addon', checked)}
                  />
                </td>
                <td className={`${td} text-right`}>
                  {isDirty(ing) && (
                    <Button size="sm" color="secondary" onClick={() => saveRow(ing)} isLoading={savingCode === ing.code}>
                      {t('save')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecipesSection({ locationId, masalaTypes, recipes, recipeLines, ingredients, onChanged, onSaved }) {
  const { t } = useLanguage();
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState({ key: '', label_en: '', label_mr: '' });
  const [typeError, setTypeError] = useState('');
  const [showAddRecipe, setShowAddRecipe] = useState(false);

  async function addMasalaType() {
    setTypeError('');
    const key = newType.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key || !newType.label_en.trim()) {
      setTypeError(t('pricingTypeRequired'));
      return;
    }
    const { error } = await supabase.from('masala_types').insert({
      location_id: locationId,
      key,
      label_en: newType.label_en.trim(),
      label_mr: newType.label_mr.trim() || null,
      sort_order: masalaTypes.length,
    });
    if (error) {
      setTypeError(error.message);
      return;
    }
    setNewType({ key: '', label_en: '', label_mr: '' });
    setShowAddType(false);
    onChanged();
    onSaved();
  }

  return (
    <div className="flex flex-col gap-3">
      <SubHeader
        title={t('masalaTypesRecipesTitle')}
        actions={
          <>
            <Button
              size="sm"
              color="secondary"
              iconLeading={showAddType ? X : Plus}
              onClick={() => setShowAddType((v) => !v)}
            >
              {showAddType ? t('cancel') : t('addMasalaType')}
            </Button>
            <Button
              size="sm"
              color="secondary"
              iconLeading={showAddRecipe ? X : Plus}
              onClick={() => setShowAddRecipe((v) => !v)}
            >
              {showAddRecipe ? t('cancel') : t('addRecipe')}
            </Button>
          </>
        }
      />

      {showAddType && (
        <AddPanel error={typeError}>
          <Input
            size="sm"
            label={t('keyLabel')}
            value={newType.key}
            onChange={(v) => setNewType({ ...newType, key: v })}
            className="w-36"
          />
          <Input
            size="sm"
            label={t('tableNameEn')}
            value={newType.label_en}
            onChange={(v) => setNewType({ ...newType, label_en: v })}
            className="w-44"
          />
          <Input
            size="sm"
            label={t('tableNameMr')}
            value={newType.label_mr}
            onChange={(v) => setNewType({ ...newType, label_mr: v })}
            className="w-44"
          />
          <Button size="sm" iconLeading={Plus} onClick={addMasalaType}>
            {t('addItem')}
          </Button>
        </AddPanel>
      )}

      {showAddRecipe && (
        <AddRecipeForm
          locationId={locationId}
          masalaTypes={masalaTypes}
          ingredients={ingredients}
          recipesCount={recipes.length}
          onDone={() => {
            setShowAddRecipe(false);
            onChanged();
            onSaved();
          }}
        />
      )}

      <div className="flex flex-col gap-5">
        {masalaTypes.map((mt) => (
          <div key={mt.key} className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-secondary">
              {mt.label_en}
              {mt.label_mr ? <span className="font-normal text-tertiary"> · {mt.label_mr}</span> : null}
            </p>
            <div className="flex flex-col overflow-hidden rounded-lg ring-1 ring-secondary ring-inset [&>*+*]:border-t [&>*+*]:border-secondary">
              {recipes
                .filter((r) => r.masala_type === mt.key)
                .map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    lines={recipeLines.filter((l) => l.recipe_id === r.id)}
                    ingredients={ingredients}
                    onChanged={onChanged}
                    onSaved={onSaved}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecipeCard({ recipe, lines, onChanged, onSaved }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [charge, setCharge] = useState(recipe.fixed_making_charge ?? '');
  const [savingCharge, setSavingCharge] = useState(false);
  const [lineEdits, setLineEdits] = useState({});

  async function saveCharge() {
    setSavingCharge(true);
    const { error } = await supabase
      .from('recipes')
      .update({ fixed_making_charge: charge === '' ? null : Number(charge) })
      .eq('id', recipe.id);
    setSavingCharge(false);
    if (error) {
      console.error('Failed to save fixed making charge', error);
      return;
    }
    onChanged();
    onSaved();
  }

  async function saveLineQty(line) {
    const qty = lineEdits[line.id];
    if (qty === undefined) return;
    const { error } = await supabase
      .from('recipe_lines')
      .update({ default_qty: Number(qty) })
      .eq('id', line.id);
    if (error) {
      console.error('Failed to save line quantity', error);
      return;
    }
    setLineEdits((prev) => {
      const next = { ...prev };
      delete next[line.id];
      return next;
    });
    onChanged();
    onSaved();
  }

  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left transition duration-100 ease-linear hover:bg-secondary"
      >
        <Chevron className="size-4 shrink-0 text-fg-quaternary" />
        <span className="text-sm font-medium text-primary">{recipe.qty_label} kg</span>
        <span className="text-sm text-tertiary">
          · {lines.length} {t('ingredientsCountSuffix')}
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-secondary bg-secondary px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-secondary">{t('fixedMakingChargeLabel')}</span>
            <span className="text-sm text-tertiary">₹</span>
            <Input
              size="sm"
              type="number"
              aria-label={t('fixedMakingChargeLabel')}
              placeholder={t('pricingUsesDefault')}
              value={String(charge ?? '')}
              onChange={setCharge}
              className="w-40"
            />
            {Number(charge || 0) !== Number(recipe.fixed_making_charge || 0) && (
              <Button size="sm" color="secondary" onClick={saveCharge} isLoading={savingCharge}>
                {t('save')}
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg bg-primary ring-1 ring-secondary ring-inset">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>{t('tableCode')}</th>
                  <th className={th}>{t('quantity')}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td className={`${td} font-medium text-primary`}>
                      {line.ingredient_code}
                      {line.is_core_chili ? (
                        <span className="font-normal text-tertiary"> ({t('coreChili')})</span>
                      ) : null}
                    </td>
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <Input
                          size="sm"
                          type="number"
                          aria-label={t('quantity')}
                          value={String(lineEdits[line.id] !== undefined ? lineEdits[line.id] : line.default_qty)}
                          onChange={(v) => setLineEdits((prev) => ({ ...prev, [line.id]: v }))}
                          className="w-24"
                        />
                        <span className="text-sm text-tertiary">{line.unit === 'piece' ? 'pcs' : 'g'}</span>
                        {lineEdits[line.id] !== undefined && Number(lineEdits[line.id]) !== Number(line.default_qty) && (
                          <Button size="sm" color="secondary" onClick={() => saveLineQty(line)}>
                            {t('save')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AddRecipeForm({ locationId, masalaTypes, ingredients, recipesCount, onDone }) {
  const { t } = useLanguage();
  const [masalaType, setMasalaType] = useState(masalaTypes[0]?.key || '');
  const [qtyLabel, setQtyLabel] = useState('');
  const [fixedCharge, setFixedCharge] = useState('');
  const [rows, setRows] = useState([{ code: ingredients[0]?.code || '', unit: 'g', qty: '', core: false }]);
  const [error, setError] = useState('');

  function updateRow(i, patch) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { code: ingredients[0]?.code || '', unit: 'g', qty: '', core: false }]);
  }
  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setError('');
    const qty = qtyLabel.trim();
    if (!masalaType || !qty || !Number(qty)) {
      setError(t('pricingRecipeRequired'));
      return;
    }
    const validRows = rows.filter((r) => r.code && r.qty && Number(r.qty) > 0);
    if (validRows.length === 0) {
      setError(t('pricingRecipeLinesRequired'));
      return;
    }
    const { data: recipeRow, error: recipeErr } = await supabase
      .from('recipes')
      .insert({
        location_id: locationId,
        masala_type: masalaType,
        qty_label: qty,
        qty_value: Number(qty),
        fixed_making_charge: fixedCharge === '' ? null : Number(fixedCharge),
        sort_order: recipesCount,
      })
      .select('id')
      .single();
    if (recipeErr) {
      setError(recipeErr.message);
      return;
    }
    const lineRows = validRows.map((r, i) => ({
      recipe_id: recipeRow.id,
      ingredient_code: r.code,
      unit: r.unit,
      default_qty: Number(r.qty),
      is_core_chili: r.core,
      row_order: i,
    }));
    const { error: linesErr } = await supabase.from('recipe_lines').insert(lineRows);
    if (linesErr) {
      setError(linesErr.message);
      return;
    }
    onDone();
  }

  const ingredientOptions = ingredients.map((ing) => ({ value: ing.code, label: ing.code }));

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-secondary p-4 ring-1 ring-secondary ring-inset">
      <div className="flex flex-wrap items-end gap-3">
        <NativeSelect
          size="sm"
          aria-label={t('masalaType')}
          value={masalaType}
          onChange={(e) => setMasalaType(e.target.value)}
          className="w-44"
          options={masalaTypes.map((mt) => ({ value: mt.key, label: mt.label_en }))}
        />
        <Input
          size="sm"
          label={t('qtyLabelField')}
          value={qtyLabel}
          onChange={setQtyLabel}
          className="w-28"
        />
        <Input
          size="sm"
          type="number"
          label={t('fixedMakingChargeLabel')}
          placeholder={t('pricingUsesDefault')}
          value={fixedCharge}
          onChange={setFixedCharge}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div className="flex flex-wrap items-center gap-3" key={i}>
            <NativeSelect
              size="sm"
              aria-label={t('tableCode')}
              value={row.code}
              onChange={(e) => updateRow(i, { code: e.target.value })}
              className="w-32"
              options={ingredientOptions}
            />
            <Input
              size="sm"
              type="number"
              aria-label={t('quantity')}
              placeholder={t('quantity')}
              value={row.qty}
              onChange={(v) => updateRow(i, { qty: v })}
              className="w-28"
            />
            <NativeSelect
              size="sm"
              aria-label={t('unitLabel')}
              value={row.unit}
              onChange={(e) => updateRow(i, { unit: e.target.value })}
              className="w-24"
              options={[
                { value: 'g', label: 'g' },
                { value: 'piece', label: 'pcs' },
              ]}
            />
            <Checkbox label={t('coreChili')} isSelected={row.core} onChange={(checked) => updateRow(i, { core: checked })} />
            <ButtonUtility size="xs" color="tertiary" tooltip={t('remove')} icon={Trash01} onClick={() => removeRow(i)} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" color="secondary" iconLeading={Plus} onClick={addRow}>
          {t('addLine')}
        </Button>
        <Button size="sm" onClick={submit}>
          {t('addRecipe')}
        </Button>
      </div>
      {error && <p className="text-sm text-error-primary">{error}</p>}
    </div>
  );
}
