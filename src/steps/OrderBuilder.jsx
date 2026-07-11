import { useState } from 'react';
import { getRecipeCatalog, typeLabel } from '../recipeCatalog.js';

const catalog = getRecipeCatalog();
const types = Object.keys(catalog);

export default function OrderBuilder({ orderItems, onChange, onBack, onNext }) {
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
      <h2>Order Builder</h2>
      <div className="section-divider" />

      <div className="form-grid">
        <label>
          Masala Type
          <select value={type} onChange={(e) => handleTypeChange(e.target.value)}>
            {types.map((t) => (
              <option key={t} value={t}>
                {typeLabel(t)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Quantity (kg)
          <select value={qtyLabel} onChange={(e) => setQtyLabel(e.target.value)}>
            {catalog[type].map((o) => (
              <option key={o.qtyLabel} value={o.qtyLabel}>
                {o.qtyLabel}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="btn-add" onClick={handleAdd}>
          + Add
        </button>
      </div>

      {orderItems.length > 0 && (
        <ul className="order-item-list">
          {orderItems.map((item, i) => (
            <li key={item.id}>
              <span>
                {i + 1}. {typeLabel(item.type)} — {item.qtyLabel} kg
              </span>
              <button type="button" className="btn-remove" onClick={() => handleRemove(item.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {orderItems.length === 0 && <p className="hint">No items added yet.</p>}

      <div className="actions">
        <button className="btn-secondary" onClick={onBack}>
          Back
        </button>
        <button className="btn-primary" disabled={orderItems.length === 0} onClick={onNext}>
          Generate Bills
        </button>
      </div>
    </section>
  );
}
