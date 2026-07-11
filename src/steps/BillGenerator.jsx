import { useState } from 'react';
import { priceRecipe } from '../pricing-engine.js';
import { getAddonIngredientCodes, typeLabel } from '../recipeCatalog.js';

const addonCodes = getAddonIngredientCodes();

export default function BillGenerator({ orderItem, itemNumber, itemCount, onConfirm }) {
  const [overrides, setOverrides] = useState({});
  const [additions, setAdditions] = useState([]);
  const [addCode, setAddCode] = useState(addonCodes[0] || '');
  const [addQty, setAddQty] = useState('');

  const result = priceRecipe(orderItem.recipeKey, {
    overrides,
    additions: additions.map(({ code, qty }) => ({ code, qty })),
  });

  function updateOverride(code, rawValue) {
    const qty = rawValue === '' ? 0 : Number(rawValue);
    setOverrides({ ...overrides, [code]: qty });
  }

  function handleAddIngredient() {
    const qty = Number(addQty);
    if (!addCode || !qty || qty <= 0) return;
    const existing = additions.find((a) => a.code === addCode);
    if (existing) {
      setAdditions(additions.map((a) => (a.code === addCode ? { ...a, qty: a.qty + qty } : a)));
    } else {
      setAdditions([...additions, { id: crypto.randomUUID(), code: addCode, qty }]);
    }
    setAddQty('');
  }

  function updateAdditionQty(id, rawValue) {
    const qty = rawValue === '' ? 0 : Number(rawValue);
    setAdditions(additions.map((a) => (a.id === id ? { ...a, qty } : a)));
  }

  function removeAddition(id) {
    setAdditions(additions.filter((a) => a.id !== id));
  }

  function handleConfirm() {
    onConfirm({
      orderItemId: orderItem.id,
      type: orderItem.type,
      qtyLabel: orderItem.qtyLabel,
      recipeKey: orderItem.recipeKey,
      lineItems: result.lineItems,
      totalWeightG: result.totalWeightG,
      ingredientsSubtotal: result.ingredientsSubtotal,
      makingCharge: result.makingCharge,
      total: result.total,
    });
  }

  const additionCodes = new Set(additions.map((a) => a.code));
  const baseLines = result.lineItems.filter((l) => !additionCodes.has(l.code));
  const addedLines = result.lineItems.filter((l) => additionCodes.has(l.code));

  return (
    <section className="card">
      <h2>
        Bill {itemNumber} of {itemCount} — {typeLabel(orderItem.type)} {orderItem.qtyLabel} kg
      </h2>
      <div className="section-divider" />

      <div className="table-scroll">
      <table className="bill-table">
        <thead>
          <tr>
            <th>Particulars</th>
            <th>Quantity</th>
            <th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {baseLines.map((line) => (
            <tr key={line.code}>
              <td>{line.code}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  step={line.unit === 'piece' ? 1 : 'any'}
                  value={overrides[line.code] != null ? overrides[line.code] : line.qty}
                  onChange={(e) => updateOverride(line.code, e.target.value)}
                />
                <span className="unit-label">{line.unit === 'piece' ? 'pcs' : 'g'}</span>
              </td>
              <td>₹{line.amount}</td>
            </tr>
          ))}

          {additions.map((addition) => {
            const line = addedLines.find((l) => l.code === addition.code);
            return (
              <tr key={addition.id} className="added-row">
                <td>{addition.code} (added)</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={addition.qty}
                    onChange={(e) => updateAdditionQty(addition.id, e.target.value)}
                  />
                  <span className="unit-label">g</span>
                </td>
                <td>
                  ₹{line ? line.amount : 0}
                  <button type="button" className="btn-remove" onClick={() => removeAddition(addition.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}

          <tr className="subtotal-row">
            <td colSpan={2}>Ingredients Subtotal</td>
            <td>₹{result.ingredientsSubtotal}</td>
          </tr>
          <tr className="making-charge-row">
            <td colSpan={2}>Making Charge ({(result.totalWeightG / 1000).toFixed(3)} kg × ₹100/kg)</td>
            <td>₹{result.makingCharge}</td>
          </tr>
          <tr className="total-row">
            <td colSpan={2}>Total</td>
            <td>₹{result.total}</td>
          </tr>
        </tbody>
      </table>
      </div>

      <div className="add-ingredient-row">
        <select value={addCode} onChange={(e) => setAddCode(e.target.value)}>
          {addonCodes.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          placeholder="Qty (g)"
          value={addQty}
          onChange={(e) => setAddQty(e.target.value)}
        />
        <button type="button" className="btn-add" onClick={handleAddIngredient}>
          + Add Chili/Ingredient
        </button>
      </div>

      <div className="actions">
        <button className="btn-primary btn-accent" onClick={handleConfirm}>
          Confirm Bill
        </button>
      </div>
    </section>
  );
}
