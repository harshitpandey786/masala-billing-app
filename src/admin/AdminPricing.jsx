import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

// Owner-editable pricing: ingredient rates, masala types, and their recipes
// (ingredient lists + quantities), all stored in Supabase so changes here
// take effect on the next bill without a code deploy. Same security model as
// the rest of /admin -- the password gates the UI, not the database (anon
// key has write access to these tables, same tradeoff already documented
// for /admin's other data).
export default function AdminPricing() {
  const { t } = useLanguage();
  const [ingredients, setIngredients] = useState([]);
  const [masalaTypes, setMasalaTypes] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [recipeLines, setRecipeLines] = useState([]);
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(supabase ? 'loading' : 'not_configured');
  const [savedFlash, setSavedFlash] = useState('');

  async function loadAll() {
    if (!supabase) return;
    setStatus('loading');
    const [i, m, r, l, s] = await Promise.all([
      supabase.from('ingredients').select('*').order('code'),
      supabase.from('masala_types').select('*').order('sort_order'),
      supabase.from('recipes').select('*').order('sort_order'),
      supabase.from('recipe_lines').select('*').order('recipe_id').order('row_order'),
      supabase.from('pricing_settings').select('*').eq('id', true).maybeSingle(),
    ]);
    if (i.error || m.error || r.error || l.error || s.error) {
      console.error('Failed to load pricing data', i.error || m.error || r.error || l.error || s.error);
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
  }, []);

  function flash(label) {
    setSavedFlash(label);
    setTimeout(() => setSavedFlash(''), 1500);
  }

  if (status === 'not_configured') return null;

  return (
    <section className="card admin-dashboard pricing-manager">
      <h2>{t('pricingManagerTitle')}</h2>

      {status === 'loading' && <p className="hint">{t('loadingResults')}</p>}
      {status === 'error' && <p className="form-error">{t('loadError')}</p>}

      {status === 'ready' && (
        <>
          {savedFlash && <p className="pricing-saved-flash">{savedFlash}</p>}

          <MakingChargeSetting settings={settings} onSaved={() => flash(t('saved'))} />

          <IngredientRateCard
            ingredients={ingredients}
            onChanged={loadAll}
            onSaved={() => flash(t('saved'))}
          />

          <RecipesSection
            masalaTypes={masalaTypes}
            recipes={recipes}
            recipeLines={recipeLines}
            ingredients={ingredients}
            onChanged={loadAll}
            onSaved={() => flash(t('saved'))}
          />
        </>
      )}
    </section>
  );
}

function MakingChargeSetting({ settings, onSaved }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(settings?.making_charge_per_kg ?? 0);
  const [saving, setSaving] = useState(false);
  const dirty = Number(value) !== Number(settings?.making_charge_per_kg ?? 0);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('pricing_settings')
      .update({ making_charge_per_kg: Number(value) })
      .eq('id', true);
    setSaving(false);
    if (error) {
      console.error('Failed to save making charge setting', error);
      return;
    }
    onSaved();
  }

  return (
    <div className="pricing-section">
      <h3>{t('makingChargePerKgLabel')}</h3>
      <div className="pricing-inline-field">
        <span>₹</span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ width: 90 }}
        />
        {dirty && (
          <button className="btn-secondary btn-small" onClick={save} disabled={saving}>
            {t('save')}
          </button>
        )}
      </div>
      <p className="hint">{t('makingChargePerKgHint')}</p>
    </div>
  );
}

function IngredientRateCard({ ingredients, onChanged, onSaved }) {
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
    const { error } = await supabase.from('ingredients').update(payload).eq('code', ing.code);
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
    <div className="pricing-section">
      <div className="pricing-section-header">
        <h3>{t('ingredientRateCardTitle')}</h3>
        <button className="btn-secondary btn-small" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? t('cancel') : t('addIngredient')}
        </button>
      </div>

      {showAddForm && (
        <div className="pricing-add-form">
          <input
            placeholder={t('tableCode')}
            value={newIng.code}
            onChange={(e) => setNewIng({ ...newIng, code: e.target.value.toUpperCase() })}
          />
          <input
            placeholder={t('tableNameEn')}
            value={newIng.name_en}
            onChange={(e) => setNewIng({ ...newIng, name_en: e.target.value })}
          />
          <input
            placeholder={t('tableNameMr')}
            value={newIng.name_mr}
            onChange={(e) => setNewIng({ ...newIng, name_mr: e.target.value })}
          />
          <select
            value={newIng.unitType}
            onChange={(e) => setNewIng({ ...newIng, unitType: e.target.value })}
          >
            <option value="kg">{t('tablePricePerKg')}</option>
            <option value="piece">{t('tablePricePerPiece')}</option>
          </select>
          <input
            type="number"
            min="0"
            placeholder="₹"
            value={newIng.price}
            onChange={(e) => setNewIng({ ...newIng, price: e.target.value })}
            style={{ width: 80 }}
          />
          <label className="pricing-checkbox-label">
            <input
              type="checkbox"
              checked={newIng.is_addon}
              onChange={(e) => setNewIng({ ...newIng, is_addon: e.target.checked })}
            />
            {t('tableAddon')}
          </label>
          <button className="btn-add btn-small" onClick={addIngredient}>
            {t('addItem')}
          </button>
          {addError && <p className="form-error">{addError}</p>}
        </div>
      )}

      <div className="table-scroll">
        <table className="bill-table ledger-table">
          <thead>
            <tr>
              <th>{t('tableCode')}</th>
              <th>{t('tableNameEn')}</th>
              <th>{t('tableNameMr')}</th>
              <th>{t('tablePricePerKg')}</th>
              <th>{t('tablePricePerPiece')}</th>
              <th>{t('tableAddon')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => (
              <tr key={ing.code} className="ledger-row">
                <td>{ing.code}</td>
                <td>
                  <input
                    value={fieldFor(ing, 'name_en')}
                    onChange={(e) => setField(ing.code, 'name_en', e.target.value)}
                    className="pricing-cell-input"
                  />
                </td>
                <td>
                  <input
                    value={fieldFor(ing, 'name_mr')}
                    onChange={(e) => setField(ing.code, 'name_mr', e.target.value)}
                    className="pricing-cell-input"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={fieldFor(ing, 'price_per_kg')}
                    onChange={(e) => setField(ing.code, 'price_per_kg', e.target.value)}
                    className="pricing-cell-input pricing-cell-input-narrow"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={fieldFor(ing, 'price_per_piece')}
                    onChange={(e) => setField(ing.code, 'price_per_piece', e.target.value)}
                    className="pricing-cell-input pricing-cell-input-narrow"
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={!!fieldFor(ing, 'is_addon')}
                    onChange={(e) => setField(ing.code, 'is_addon', e.target.checked)}
                  />
                </td>
                <td>
                  {isDirty(ing) && (
                    <button
                      className="btn-secondary btn-small"
                      onClick={() => saveRow(ing)}
                      disabled={savingCode === ing.code}
                    >
                      {t('save')}
                    </button>
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

function RecipesSection({ masalaTypes, recipes, recipeLines, ingredients, onChanged, onSaved }) {
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
    <div className="pricing-section">
      <div className="pricing-section-header">
        <h3>{t('masalaTypesRecipesTitle')}</h3>
        <div className="pricing-section-header-actions">
          <button className="btn-secondary btn-small" onClick={() => setShowAddType((v) => !v)}>
            {showAddType ? t('cancel') : t('addMasalaType')}
          </button>
          <button className="btn-secondary btn-small" onClick={() => setShowAddRecipe((v) => !v)}>
            {showAddRecipe ? t('cancel') : t('addRecipe')}
          </button>
        </div>
      </div>

      {showAddType && (
        <div className="pricing-add-form">
          <input
            placeholder={t('keyLabel')}
            value={newType.key}
            onChange={(e) => setNewType({ ...newType, key: e.target.value })}
          />
          <input
            placeholder={t('tableNameEn')}
            value={newType.label_en}
            onChange={(e) => setNewType({ ...newType, label_en: e.target.value })}
          />
          <input
            placeholder={t('tableNameMr')}
            value={newType.label_mr}
            onChange={(e) => setNewType({ ...newType, label_mr: e.target.value })}
          />
          <button className="btn-add btn-small" onClick={addMasalaType}>
            {t('addItem')}
          </button>
          {typeError && <p className="form-error">{typeError}</p>}
        </div>
      )}

      {showAddRecipe && (
        <AddRecipeForm
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

      {masalaTypes.map((mt) => (
        <div key={mt.key} className="pricing-type-group">
          <h4>
            {mt.label_en}
            {mt.label_mr ? ` · ${mt.label_mr}` : ''}
          </h4>
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
      ))}
    </div>
  );
}

function RecipeCard({ recipe, lines, ingredients, onChanged, onSaved }) {
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

  return (
    <div className="pricing-recipe-card">
      <button type="button" className="pricing-recipe-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} {recipe.qty_label} kg
        <span className="hint"> · {lines.length} {t('ingredientsCountSuffix')}</span>
      </button>

      {open && (
        <div className="pricing-recipe-body">
          <div className="pricing-inline-field">
            <label>{t('fixedMakingChargeLabel')}</label>
            <span>₹</span>
            <input
              type="number"
              min="0"
              value={charge}
              onChange={(e) => setCharge(e.target.value)}
              style={{ width: 80 }}
              placeholder={t('pricingUsesDefault')}
            />
            {Number(charge || 0) !== Number(recipe.fixed_making_charge || 0) && (
              <button className="btn-secondary btn-small" onClick={saveCharge} disabled={savingCharge}>
                {t('save')}
              </button>
            )}
          </div>

          <div className="table-scroll">
            <table className="bill-table ledger-table">
              <thead>
                <tr>
                  <th>{t('tableCode')}</th>
                  <th>{t('quantity')}</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="ledger-row">
                    <td>
                      {line.ingredient_code}
                      {line.is_core_chili ? ` (${t('coreChili')})` : ''}
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={lineEdits[line.id] !== undefined ? lineEdits[line.id] : line.default_qty}
                        onChange={(e) =>
                          setLineEdits((prev) => ({ ...prev, [line.id]: e.target.value }))
                        }
                        className="pricing-cell-input pricing-cell-input-narrow"
                      />{' '}
                      {line.unit === 'piece' ? 'pcs' : 'g'}
                      {lineEdits[line.id] !== undefined &&
                        Number(lineEdits[line.id]) !== Number(line.default_qty) && (
                          <button
                            className="btn-secondary btn-small"
                            onClick={() => saveLineQty(line)}
                          >
                            {t('save')}
                          </button>
                        )}
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

function AddRecipeForm({ masalaTypes, ingredients, recipesCount, onDone }) {
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

  return (
    <div className="pricing-add-form pricing-add-recipe-form">
      <div className="pricing-inline-field">
        <select value={masalaType} onChange={(e) => setMasalaType(e.target.value)}>
          {masalaTypes.map((mt) => (
            <option key={mt.key} value={mt.key}>
              {mt.label_en}
            </option>
          ))}
        </select>
        <input
          placeholder={t('qtyLabelField')}
          value={qtyLabel}
          onChange={(e) => setQtyLabel(e.target.value)}
          style={{ width: 80 }}
        />
        <span>{t('fixedMakingChargeLabel')}</span>
        <input
          type="number"
          min="0"
          placeholder={t('pricingUsesDefault')}
          value={fixedCharge}
          onChange={(e) => setFixedCharge(e.target.value)}
          style={{ width: 90 }}
        />
      </div>

      {rows.map((row, i) => (
        <div className="pricing-inline-field" key={i}>
          <select value={row.code} onChange={(e) => updateRow(i, { code: e.target.value })}>
            {ingredients.map((ing) => (
              <option key={ing.code} value={ing.code}>
                {ing.code}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            placeholder={t('quantity')}
            value={row.qty}
            onChange={(e) => updateRow(i, { qty: e.target.value })}
            style={{ width: 70 }}
          />
          <select value={row.unit} onChange={(e) => updateRow(i, { unit: e.target.value })}>
            <option value="g">g</option>
            <option value="piece">pcs</option>
          </select>
          <label className="pricing-checkbox-label">
            <input
              type="checkbox"
              checked={row.core}
              onChange={(e) => updateRow(i, { core: e.target.checked })}
            />
            {t('coreChili')}
          </label>
          <button className="btn-remove" onClick={() => removeRow(i)}>
            ✕
          </button>
        </div>
      ))}

      <div className="pricing-inline-field">
        <button className="btn-secondary btn-small" onClick={addRow}>
          {t('addLine')}
        </button>
        <button className="btn-add btn-small" onClick={submit}>
          {t('addRecipe')}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
