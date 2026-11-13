import { useEffect, useMemo, useRef, useState } from 'react';
import { getRecipeCatalog } from '../recipeCatalog.js';
import { priceRecipe } from '../pricing-engine.js';
import { lookupProductByBarcode, searchProductsByName } from '../productLookup.js';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';

function unitAbbrev(unit) {
  if (unit === 'piece') return 'pcs';
  if (unit === 'kg') return 'kg';
  return 'g';
}

function estimateCustomTotal(item, pricingConfig) {
  try {
    return priceRecipe(item.recipeKey, { config: pricingConfig }).total;
  } catch {
    return null;
  }
}

function ProductScanner({ orderItems, onChange, locationId, pricingConfig }) {
  const { t } = useLanguage();
  const [barcode, setBarcode] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [matches, setMatches] = useState([]);
  const [pending, setPending] = useState(null); // the scanned/selected product, awaiting qty + Add
  const [qty, setQty] = useState(1);
  const [notFound, setNotFound] = useState(false);
  const barcodeInputRef = useRef(null);

  // Keeps the scan field focused between scans so a USB/Bluetooth barcode
  // scanner (which just "types" the code + Enter) can be used back-to-back
  // without the operator clicking back into the field each time.
  useEffect(() => {
    if (!pending) barcodeInputRef.current?.focus();
  }, [pending]);

  async function handleBarcodeKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = barcode.trim();
    if (!code) return;
    setNotFound(false);
    const product = await lookupProductByBarcode(code, locationId);
    setBarcode('');
    if (!product) {
      setNotFound(true);
      return;
    }
    setPending(product);
    setQty(1);
  }

  useEffect(() => {
    if (!nameSearch.trim()) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      const results = await searchProductsByName(nameSearch, locationId);
      if (!cancelled) setMatches(results);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [nameSearch, locationId]);

  function selectMatch(product) {
    setPending(product);
    setQty(1);
    setNameSearch('');
    setMatches([]);
  }

  function cancelPending() {
    setPending(null);
    setNotFound(false);
  }

  function handleAddPending() {
    if (!pending || !qty || qty <= 0) return;
    onChange([
      ...orderItems,
      {
        id: crypto.randomUUID(),
        kind: 'product',
        productId: pending.id,
        name: pending.name_en,
        unit: pending.unit,
        qty: Number(qty),
        unitPrice: Number(pending.price),
      },
    ]);
    setPending(null);
  }

  return (
    <div className="product-scan-section">
      <h3>{t('readyMadeProductsTitle')}</h3>

      <div className="form-grid">
        <label>
          {t('scanBarcodeLabel')}
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
            placeholder={t('scanBarcodePlaceholder')}
            disabled={!!pending}
          />
        </label>

        <label>
          {t('searchProductLabel')}
          <input
            type="text"
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
            placeholder={t('searchProductPlaceholder')}
            disabled={!!pending}
          />
        </label>
      </div>

      {notFound && <p className="form-error">{t('unknownBarcode')}</p>}

      {matches.length > 0 && (
        <ul className="product-match-list">
          {matches.map((m) => (
            <li key={m.id}>
              <button type="button" className="product-match-button" onClick={() => selectMatch(m)}>
                {m.name_en} — ₹{m.price}/{unitAbbrev(m.unit)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <div className="product-pending-card">
          <p className="product-pending-name">
            {pending.name_en} — ₹{pending.price}/{unitAbbrev(pending.unit)}
          </p>
          {pending.qtyOnHand != null && (
            <p className={pending.qtyOnHand > 0 ? 'hint' : 'form-error'}>
              {pending.qtyOnHand > 0
                ? `${t('stockHereLabel')}: ${pending.qtyOnHand}`
                : t('outOfStockWarning')}
            </p>
          )}
          <div className="pricing-inline-field">
            <label>{t('quantity')}</label>
            <input
              type="number"
              min="0"
              step={pending.unit === 'piece' ? 1 : 'any'}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={{ width: 80 }}
            />
            <span className="unit-label">{unitAbbrev(pending.unit)}</span>
          </div>
          <div className="actions">
            <button type="button" className="btn-secondary" onClick={cancelPending}>
              {t('cancel')}
            </button>
            <button type="button" className="btn-add" onClick={handleAddPending}>
              {t('addItem')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderBuilder({ orderItems, onChange, onBack, onNext, pricingConfig, locationId }) {
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
        kind: 'custom',
        type,
        qtyLabel: option.qtyLabel,
        recipeKey: option.recipeKey,
      },
    ]);
  }

  function handleRemove(id) {
    onChange(orderItems.filter((item) => item.id !== id));
  }

  const cartTotal = useMemo(
    () =>
      orderItems.reduce((sum, item) => {
        if (item.kind === 'product') return sum + item.qty * item.unitPrice;
        const estimate = estimateCustomTotal(item, pricingConfig);
        return estimate != null ? sum + estimate : sum;
      }, 0),
    [orderItems, pricingConfig]
  );

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

      <div className="section-divider" />

      <ProductScanner
        orderItems={orderItems}
        onChange={onChange}
        locationId={locationId}
        pricingConfig={pricingConfig}
      />

      {orderItems.length > 0 && (
        <ul className="order-item-list">
          {orderItems.map((item, i) => (
            <li key={item.id}>
              <span>
                {i + 1}.{' '}
                {item.kind === 'product'
                  ? `${item.name} — ${item.qty} ${unitAbbrev(item.unit)} (₹${item.qty * item.unitPrice})`
                  : `${masalaTypeLabel(t, item.type, pricingConfig?.masala_types, lang)} — ${item.qtyLabel} kg`}
              </span>
              <button type="button" className="btn-remove" onClick={() => handleRemove(item.id)}>
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {orderItems.length === 0 && <p className="hint">{t('noItemsYet')}</p>}

      {orderItems.length > 0 && (
        <p className="cart-running-total">
          {t('cartTotalLabel')}: ₹{Math.round(cartTotal)}
        </p>
      )}

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
