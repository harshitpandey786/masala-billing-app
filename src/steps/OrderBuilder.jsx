import { useMemo, useState } from 'react';
import { getRecipeCatalog } from '../recipeCatalog.js';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';

export default function OrderBuilder({ orderItems, onChange, onBack, onNext, pricingConfig }) {
  const { t, lang } = useLanguage();
  const catalog = useMemo(() => getRecipeCatalog(pricingConfig), [pricingConfig]);
  const types = Object.keys(catalog);
  const [type, setType] = useState(types[0]);
  const [qtyLabel, setQtyLabel] = useState(catalog[types[0]][0].qtyLabel);

  function handleTypeChange(nextType) {
    setType(nextType);
    setQtyLabel(catalog[nextType][0].qtyLabel);
  }

  function handleAdd() {
    const option = catalog[type].find((o) => o.qtyLabel === qtyLabel);
    if (!option) return;
    onChange([
      ...orderItems,
      {
        id: crypto.randomUUID(),
        type,
        qtyLabel: option.qtyLabel,
        recipeKey: option.recipeKey,
      },
    ]);
  }

  function handleRemove(id) {
    onChange(orderItems.filter((item) => item.id !== id));
  }

  return (
    <section className="card">
      <h2>{t('orderBuilderTitle')}</h2>
      <div className="section-divider" />

      <div className="form-grid">
        <label>
          {t('masalaType')}
          <select value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            {types.map((ty) => (
              <option key={ty} value={ty}>
                {masalaTypeLabel(t, ty, pricingConfig?.masala_types, lang)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t('quantityKg')}
          <select value={qtyLabel} onChange={(e) => setQtyLabel(e.target.value)}>
            {catalog[type].map((o) => (
              <option key={o.qtyLabel} value={o.qtyLabel}>
                {o.qtyLabel}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="btn-add" onClick={handleAdd}>
          {t('addItem')}
        </button>
      </div>

      {orderItems.length > 0 && (
        <ul className="order-item-list">
          {orderItems.map((item, i) => (
            <li key={item.id}>
              <span>
                {i + 1}. {masalaTypeLabel(t, item.type, pricingConfig?.masala_types, lang)} — {item.qtyLabel} kg
              </span>
              <button type="button" className="btn-remove" onClick={() => handleRemove(item.id)}>
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {orderItems.length === 0 && <p className="hint">{t('noItemsYet')}</p>}

      <div className="actions">
        <button className="btn-secondary" onClick={onBack}>
          {t('back')}
        </button>
        <button className="btn-primary" disabled={orderItems.length === 0} onClick={onNext}>
          {t('generateBills')}
        </button>
      </div>
    </section>
  );
}
