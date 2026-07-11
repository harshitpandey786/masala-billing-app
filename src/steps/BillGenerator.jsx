import { useState } from 'react';
import { priceRecipe } from '../pricing-engine.js';
import { getAddonIngredientCodes, getCoreChiliRowCodes, typeLabel } from '../recipeCatalog.js';

const addonCodes = getAddonIngredientCodes();
const coreChiliCodes = getCoreChiliRowCodes();

function BaseLineRow({ line, overrides, onChangeQty }) {
  return (
    <tr>
      <td>{line.code}</td>
      <td>
        <input
          type="number"
          min="0"
          step={line.unit === 'piece' ? 1 : 'any'}
          value={overrides[line.code] != null ? overrides[line.code] : line.qty}
          onChange={(e) => onChangeQty(line.code, e.target.value)}
        />
        <span className="unit-label">{line.unit === 'piece' ? 'pcs' : 'g'}</span>
      </td>
      <td>₹{line.amount}</td>
    </tr>
  );
}

export default function BillGenerator({ orderItem, itemNumber, itemCount, onConfirm }) {
  const [overrides, setOverrides] = useState({});
  const [additions, setAdditions] = useState([]);
  const [addCode, setAddCode] = useState(addonCodes[0] || '');
  const [addQty, setAddQty] = useState('');
  const [makingChargeOverride, setMakingChargeOverride] = useState(null);

  const result = priceRecipe(orderItem.recipeKey, {
    overrides,
    additions: additions.map(({ code, qty }) => ({ code, qty })),
    makingChargeOverride: makingChargeOverride != null ? makingChargeOverride : undefined,
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

  // Render added chilies right after the core chili rows (GTDC/ABDC/AKDC), matching
  // where the pricing engine places them in the confirmed bill / shared image.
  const lastCoreChiliIdx = baseLines.reduce(
    (idx, line, i) => (coreChiliCodes.includes(line.code) ? i : idx),
    -1
  );
  const linesBeforeAdditions = baseLines.slice(0, lastCoreChiliIdx + 1);
  const linesAfterAdditions = baseLines.slice(lastCoreChiliIdx + 1);

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
          {linesBeforeAdditions.map((line) => (
            <BaseLineRow key={line.code} line={line} overrides={overrides} onChangeQty={updateOverride} />
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

          {linesAfterAdditions.map((line) => (
            <BaseLineRow key={line.code} line={line} overrides={overrides} onChangeQty={updateOverride} />
          ))}

          <tr className="subtotal-row">
            <td colSpan={2}>Ingredients Subtotal</td>
            <td>₹{result.ingredientsSubtotal}</td>
          </tr>
          <tr className="making-charge-row">
            <td colSpan={2}>Making Charge</td>
            <td>
              ₹
              <input
                type="number"
                min="0"
                className="making-charge-input"
                value={result.makingCharge}
                onChange={(e) =>
                  setMakingChargeOverride(e.target.value === '' ? 0 : Number(e.target.value))
                }
              />
            </td>
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
