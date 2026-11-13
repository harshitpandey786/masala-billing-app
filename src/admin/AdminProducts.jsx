import { useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

function generateBarcode() {
  return `MB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

// Prints `count` copies of the same product's barcode label on one page, laid
// out in a grid so they can be cut apart and stuck on each unit of a batch --
// e.g. "making 40 packets of Malvani ready-made today" prints 40 labels in
// one go instead of one at a time.
function printBarcodeLabels(product, count) {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, product.barcode, { format: 'CODE128', displayValue: true, fontSize: 14, height: 50 });
  const dataUrl = canvas.toDataURL('image/png');
  const win = window.open('', '_blank', 'width=640,height=480');
  if (!win) return;
  const label = `
    <div class="label">
      <div class="name">${product.name_en}</div>
      <div class="price">₹${product.price}</div>
      <img src="${dataUrl}" alt="barcode" />
    </div>`;
  win.document.write(`
    <html>
      <head>
        <title>${product.name_en}</title>
        <style>
          body { font-family: sans-serif; margin: 16px; }
          .sheet { display: flex; flex-wrap: wrap; gap: 10px; }
          .label {
            width: 190px;
            padding: 10px;
            border: 1px dashed #999;
            border-radius: 8px;
            text-align: center;
          }
          .name { font-weight: 600; font-size: 13px; margin-bottom: 2px; }
          .price { font-size: 12px; margin-bottom: 6px; }
          .label img { max-width: 100%; }
        </style>
      </head>
      <body>
        <div class="sheet">${label.repeat(count)}</div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  win.document.close();
}

// Owner-editable product catalog (ready-made + loose items), each with a
// unique barcode scanned at the till (see productLookup.js /
// OrderBuilder.jsx), plus per-shop stock levels. Same load/edit/save pattern
// as AdminPricing.jsx's ingredient rate card.
export default function AdminProducts() {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stockLevels, setStockLevels] = useState([]);
  const [status, setStatus] = useState(supabase ? 'loading' : 'not_configured');
  const [savedFlash, setSavedFlash] = useState('');

  async function loadAll() {
    if (!supabase) return;
    setStatus('loading');
    const [p, l, s] = await Promise.all([
      supabase.from('products').select('*').order('created_at'),
      supabase.from('locations').select('id, name').order('name'),
      supabase.from('stock_levels').select('*'),
    ]);
    if (p.error || l.error || s.error) {
      console.error('Failed to load products', p.error || l.error || s.error);
      setStatus('error');
      return;
    }
    setProducts(p.data || []);
    setLocations(l.data || []);
    setStockLevels(s.data || []);
    setStatus('ready');
  }

  useEffect(() => {
    loadAll();
  }, []);

  function flash(label) {
    setSavedFlash(label);
    setTimeout(() => setSavedFlash(''), 1500);
  }

  if (status === 'not_configured') return null;

  return (
    <section className="card admin-dashboard pricing-manager">
      <h2>{t('productsManagerTitle')}</h2>

      {status === 'loading' && <p className="hint">{t('loadingResults')}</p>}
      {status === 'error' && <p className="form-error">{t('loadError')}</p>}

      {status === 'ready' && (
        <>
          {savedFlash && <p className="pricing-saved-flash">{savedFlash}</p>}

          <ProductTable products={products} onChanged={loadAll} onSaved={() => flash(t('saved'))} />

          <StockGrid
            products={products}
            locations={locations}
            stockLevels={stockLevels}
            onChanged={loadAll}
            onSaved={() => flash(t('saved'))}
          />
        </>
      )}
    </section>
  );
}

function ProductTable({ products, onChanged, onSaved }) {
  const { t } = useLanguage();
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    barcode: '',
    name_en: '',
    name_mr: '',
    category: 'ready_made',
    unit: 'piece',
    price: '',
    batchQty: '',
  });
  const [addError, setAddError] = useState('');
  const [printQty, setPrintQty] = useState({});

  function fieldFor(p, field) {
    return edits[p.id]?.[field] !== undefined ? edits[p.id][field] : p[field] ?? '';
  }
  function setField(id, field, value) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }
  function isDirty(p) {
    const e = edits[p.id];
    if (!e) return false;
    return Object.entries(e).some(([k, v]) => String(v) !== String(p[k] ?? ''));
  }

  async function saveRow(p) {
    const e = edits[p.id];
    if (!e) return;
    setSavingId(p.id);
    const payload = {};
    if (e.name_en !== undefined) payload.name_en = e.name_en;
    if (e.name_mr !== undefined) payload.name_mr = e.name_mr || null;
    if (e.category !== undefined) payload.category = e.category;
    if (e.unit !== undefined) payload.unit = e.unit;
    if (e.price !== undefined) payload.price = Number(e.price);
    if (e.is_active !== undefined) payload.is_active = !!e.is_active;
    const { error } = await supabase.from('products').update(payload).eq('id', p.id);
    setSavingId(null);
    if (error) {
      console.error('Failed to save product', error);
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
    onChanged();
    onSaved();
  }

  async function addProduct() {
    setAddError('');
    if (!newProduct.name_en.trim()) {
      setAddError(t('productNameRequired'));
      return;
    }
    if (!newProduct.price || Number(newProduct.price) <= 0) {
      setAddError(t('pricingPriceRequired'));
      return;
    }
    const barcode = newProduct.barcode.trim() || generateBarcode();
    const { data, error } = await supabase
      .from('products')
      .insert({
        barcode,
        name_en: newProduct.name_en.trim(),
        name_mr: newProduct.name_mr.trim() || null,
        category: newProduct.category,
        unit: newProduct.unit,
        price: Number(newProduct.price),
      })
      .select()
      .single();
    if (error) {
      setAddError(error.message);
      return;
    }
    const batchQty = Number(newProduct.batchQty);
    if (batchQty > 0) printBarcodeLabels(data, batchQty);
    setNewProduct({
      barcode: '',
      name_en: '',
      name_mr: '',
      category: 'ready_made',
      unit: 'piece',
      price: '',
      batchQty: '',
    });
    setShowAddForm(false);
    onChanged();
    onSaved();
  }

  return (
    <div className="pricing-section">
      <div className="pricing-section-header">
        <h3>{t('productsTableTitle')}</h3>
        <button className="btn-secondary btn-small" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? t('cancel') : t('addProduct')}
        </button>
      </div>

      {showAddForm && (
        <div className="pricing-add-form">
          <input
            placeholder={t('tableNameEn')}
            value={newProduct.name_en}
            onChange={(e) => setNewProduct({ ...newProduct, name_en: e.target.value })}
          />
          <input
            placeholder={t('tableNameMr')}
            value={newProduct.name_mr}
            onChange={(e) => setNewProduct({ ...newProduct, name_mr: e.target.value })}
          />
          <select
            value={newProduct.category}
            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
          >
            <option value="ready_made">{t('readyMadeLabel')}</option>
            <option value="loose">{t('looseLabel')}</option>
          </select>
          <select value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}>
            <option value="piece">{t('unitPiece')}</option>
            <option value="kg">{t('unitKg')}</option>
            <option value="g">{t('unitGram')}</option>
          </select>
          <input
            type="number"
            min="0"
            placeholder="₹"
            value={newProduct.price}
            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
            style={{ width: 80 }}
          />
          <input
            placeholder={t('barcodeOptionalPlaceholder')}
            value={newProduct.barcode}
            onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
          />
          <label className="label-qty-field">
            {t('batchQtyLabel')}
            <input
              type="number"
              min="0"
              placeholder={t('batchQtyPlaceholder')}
              value={newProduct.batchQty}
              onChange={(e) => setNewProduct({ ...newProduct, batchQty: e.target.value })}
            />
          </label>
          <button className="btn-add btn-small" onClick={addProduct}>
            {t('addItem')}
          </button>
          {addError && <p className="form-error">{addError}</p>}
        </div>
      )}

      <div className="table-scroll">
        <table className="bill-table ledger-table">
          <thead>
            <tr>
              <th>{t('tableNameEn')}</th>
              <th>{t('tableNameMr')}</th>
              <th>{t('categoryLabel')}</th>
              <th>{t('unitLabel')}</th>
              <th>{t('priceLabel')}</th>
              <th>{t('barcodeLabel')}</th>
              <th>{t('activeLabel')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="ledger-row">
                <td>
                  <input
                    value={fieldFor(p, 'name_en')}
                    onChange={(e) => setField(p.id, 'name_en', e.target.value)}
                    className="pricing-cell-input"
                  />
                </td>
                <td>
                  <input
                    value={fieldFor(p, 'name_mr')}
                    onChange={(e) => setField(p.id, 'name_mr', e.target.value)}
                    className="pricing-cell-input"
                  />
                </td>
                <td>
                  <select value={fieldFor(p, 'category')} onChange={(e) => setField(p.id, 'category', e.target.value)}>
                    <option value="ready_made">{t('readyMadeLabel')}</option>
                    <option value="loose">{t('looseLabel')}</option>
                  </select>
                </td>
                <td>
                  <select value={fieldFor(p, 'unit')} onChange={(e) => setField(p.id, 'unit', e.target.value)}>
                    <option value="piece">{t('unitPiece')}</option>
                    <option value="kg">{t('unitKg')}</option>
                    <option value="g">{t('unitGram')}</option>
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    value={fieldFor(p, 'price')}
                    onChange={(e) => setField(p.id, 'price', e.target.value)}
                    className="pricing-cell-input pricing-cell-input-narrow"
                  />
                </td>
                <td className="hint">{p.barcode}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={!!fieldFor(p, 'is_active')}
                    onChange={(e) => setField(p.id, 'is_active', e.target.checked)}
                  />
                </td>
                <td>
                  <div className="pricing-inline-field">
                    {isDirty(p) && (
                      <button
                        className="btn-secondary btn-small"
                        onClick={() => saveRow(p)}
                        disabled={savingId === p.id}
                      >
                        {t('save')}
                      </button>
                    )}
                    <label className="label-qty-field">
                      <input
                        type="number"
                        min="1"
                        value={printQty[p.id] ?? 1}
                        onChange={(e) => setPrintQty((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      />
                    </label>
                    <button
                      className="btn-secondary btn-small"
                      onClick={() => printBarcodeLabels(p, Math.max(1, Number(printQty[p.id] ?? 1)))}
                    >
                      {t('printLabel')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockGrid({ products, locations, stockLevels, onChanged, onSaved }) {
  const { t } = useLanguage();
  const [edits, setEdits] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  function cellKey(productId, locationId) {
    return `${productId}:${locationId}`;
  }
  function stockFor(productId, locationId) {
    return stockLevels.find((s) => s.product_id === productId && s.location_id === locationId);
  }
  function fieldValue(productId, locationId) {
    const key = cellKey(productId, locationId);
    if (edits[key] !== undefined) return edits[key];
    return stockFor(productId, locationId)?.qty_on_hand ?? 0;
  }
  function isDirty(productId, locationId) {
    const key = cellKey(productId, locationId);
    if (edits[key] === undefined) return false;
    const current = stockFor(productId, locationId)?.qty_on_hand ?? 0;
    return Number(edits[key]) !== Number(current);
  }

  async function saveCell(productId, locationId) {
    const key = cellKey(productId, locationId);
    const qty = Number(edits[key]);
    setSavingKey(key);
    const { error } = await supabase
      .from('stock_levels')
      .upsert({ product_id: productId, location_id: locationId, qty_on_hand: qty }, { onConflict: 'product_id,location_id' });
    setSavingKey(null);
    if (error) {
      console.error('Failed to save stock level', error);
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    onChanged();
    onSaved();
  }

  if (locations.length === 0) {
    return <p className="hint">{t('noLocationsYetHint')}</p>;
  }

  return (
    <div className="pricing-section">
      <h3>{t('stockGridTitle')}</h3>
      <div className="table-scroll">
        <table className="bill-table ledger-table">
          <thead>
            <tr>
              <th>{t('tableNameEn')}</th>
              {locations.map((loc) => (
                <th key={loc.id}>{loc.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="ledger-row">
                <td>{p.name_en}</td>
                {locations.map((loc) => {
                  const key = cellKey(p.id, loc.id);
                  return (
                    <td key={loc.id}>
                      <input
                        type="number"
                        min="0"
                        value={fieldValue(p.id, loc.id)}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="pricing-cell-input pricing-cell-input-narrow"
                      />
                      {isDirty(p.id, loc.id) && (
                        <button
                          className="btn-secondary btn-small"
                          onClick={() => saveCell(p.id, loc.id)}
                          disabled={savingKey === key}
                        >
                          {t('save')}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
