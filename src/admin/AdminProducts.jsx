import { Fragment, useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { CheckCircle, Plus, Printer, X } from '@untitledui/icons';
import { BadgeWithIcon } from '@/components/base/badges/badges';
import { Button } from '@/components/base/buttons/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Input } from '@/components/base/input/input';
import { NativeSelect } from '@/components/base/select/select-native';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

const th = 'border-b border-secondary bg-secondary px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-tertiary';
const td = 'border-b border-secondary px-4 py-3 align-middle text-sm text-tertiary';

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

function SubHeader({ title, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-md font-semibold text-primary">{title}</h3>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
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
    <section className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
      <div className="flex items-center justify-between gap-4 border-b border-secondary px-4 py-5 md:px-6">
        <h2 className="text-lg font-semibold text-primary">{t('productsManagerTitle')}</h2>
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
      </div>
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

  const categoryOptions = [
    { value: 'ready_made', label: t('readyMadeLabel') },
    { value: 'loose', label: t('looseLabel') },
  ];
  const unitOptions = [
    { value: 'piece', label: t('unitPiece') },
    { value: 'kg', label: t('unitKg') },
    { value: 'g', label: t('unitGram') },
  ];

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
    <div className="flex flex-col gap-3">
      <SubHeader
        title={t('productsTableTitle')}
        actions={
          <Button
            size="sm"
            color="secondary"
            iconLeading={showAddForm ? X : Plus}
            onClick={() => setShowAddForm((v) => !v)}
          >
            {showAddForm ? t('cancel') : t('addProduct')}
          </Button>
        }
      />

      {showAddForm && (
        <div className="flex flex-col gap-3 rounded-lg bg-secondary p-4 ring-1 ring-secondary ring-inset">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              size="sm"
              label={t('tableNameEn')}
              value={newProduct.name_en}
              onChange={(v) => setNewProduct({ ...newProduct, name_en: v })}
              className="w-48"
            />
            <Input
              size="sm"
              label={t('tableNameMr')}
              value={newProduct.name_mr}
              onChange={(v) => setNewProduct({ ...newProduct, name_mr: v })}
              className="w-48"
            />
            <NativeSelect
              size="sm"
              label={t('categoryLabel')}
              value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
              className="w-40"
              options={categoryOptions}
            />
            <NativeSelect
              size="sm"
              label={t('unitLabel')}
              value={newProduct.unit}
              onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
              className="w-32"
              options={unitOptions}
            />
            <Input
              size="sm"
              type="number"
              label={t('priceLabel')}
              placeholder="₹"
              value={newProduct.price}
              onChange={(v) => setNewProduct({ ...newProduct, price: v })}
              className="w-28"
            />
            <Input
              size="sm"
              label={t('barcodeLabel')}
              placeholder={t('barcodeOptionalPlaceholder')}
              value={newProduct.barcode}
              onChange={(v) => setNewProduct({ ...newProduct, barcode: v })}
              className="w-52"
            />
            <Input
              size="sm"
              type="number"
              label={t('batchQtyLabel')}
              placeholder={t('batchQtyPlaceholder')}
              value={newProduct.batchQty}
              onChange={(v) => setNewProduct({ ...newProduct, batchQty: v })}
              className="w-44"
            />
            <Button size="sm" iconLeading={Plus} onClick={addProduct}>
              {t('addItem')}
            </Button>
          </div>
          {addError && <p className="text-sm text-error-primary">{addError}</p>}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg ring-1 ring-secondary ring-inset">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>{t('tableNameEn')}</th>
              <th className={th}>{t('tableNameMr')}</th>
              <th className={th}>{t('categoryLabel')}</th>
              <th className={th}>{t('unitLabel')}</th>
              <th className={th}>{t('priceLabel')}</th>
              <th className={th}>{t('barcodeLabel')}</th>
              <th className={th}>{t('activeLabel')}</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-secondary">
                <td className={td}>
                  <Input
                    size="sm"
                    aria-label={t('tableNameEn')}
                    value={String(fieldFor(p, 'name_en'))}
                    onChange={(v) => setField(p.id, 'name_en', v)}
                    className="min-w-40"
                  />
                </td>
                <td className={td}>
                  <Input
                    size="sm"
                    aria-label={t('tableNameMr')}
                    value={String(fieldFor(p, 'name_mr'))}
                    onChange={(v) => setField(p.id, 'name_mr', v)}
                    className="min-w-40"
                  />
                </td>
                <td className={td}>
                  <NativeSelect
                    size="sm"
                    aria-label={t('categoryLabel')}
                    value={fieldFor(p, 'category')}
                    onChange={(e) => setField(p.id, 'category', e.target.value)}
                    className="w-36"
                    options={categoryOptions}
                  />
                </td>
                <td className={td}>
                  <NativeSelect
                    size="sm"
                    aria-label={t('unitLabel')}
                    value={fieldFor(p, 'unit')}
                    onChange={(e) => setField(p.id, 'unit', e.target.value)}
                    className="w-28"
                    options={unitOptions}
                  />
                </td>
                <td className={td}>
                  <Input
                    size="sm"
                    type="number"
                    aria-label={t('priceLabel')}
                    value={String(fieldFor(p, 'price'))}
                    onChange={(v) => setField(p.id, 'price', v)}
                    className="w-24"
                  />
                </td>
                <td className={`${td} font-mono text-xs whitespace-nowrap`}>{p.barcode}</td>
                <td className={td}>
                  <Checkbox
                    aria-label={t('activeLabel')}
                    isSelected={!!fieldFor(p, 'is_active')}
                    onChange={(checked) => setField(p.id, 'is_active', checked)}
                  />
                </td>
                <td className={td}>
                  <div className="flex items-center justify-end gap-2">
                    {isDirty(p) && (
                      <Button size="sm" color="secondary" onClick={() => saveRow(p)} isLoading={savingId === p.id}>
                        {t('save')}
                      </Button>
                    )}
                    <Input
                      size="sm"
                      type="number"
                      aria-label={t('batchQtyLabel')}
                      value={String(printQty[p.id] ?? 1)}
                      onChange={(v) => setPrintQty((prev) => ({ ...prev, [p.id]: v }))}
                      className="w-20"
                    />
                    <Button
                      size="sm"
                      color="secondary"
                      iconLeading={Printer}
                      onClick={() => printBarcodeLabels(p, Math.max(1, Number(printQty[p.id] ?? 1)))}
                      className="whitespace-nowrap"
                    >
                      {t('printLabel')}
                    </Button>
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

// Price now lives per (product, shop) in `stock_levels.price`, right next to
// the per-shop stock count it already tracked -- so each cell edits two
// independent fields (price, qty_on_hand) instead of one. See
// docs/supabase-setup.md §9.
function StockGrid({ products, locations, stockLevels, onChanged, onSaved }) {
  const { t } = useLanguage();
  const [edits, setEdits] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  function cellKey(productId, locationId, field) {
    return `${productId}:${locationId}:${field}`;
  }
  function stockFor(productId, locationId) {
    return stockLevels.find((s) => s.product_id === productId && s.location_id === locationId);
  }
  function fieldValue(product, locationId, field, fallback) {
    const key = cellKey(product.id, locationId, field);
    if (edits[key] !== undefined) return edits[key];
    return stockFor(product.id, locationId)?.[field] ?? fallback;
  }
  function isDirty(product, locationId, field, fallback) {
    const key = cellKey(product.id, locationId, field);
    if (edits[key] === undefined) return false;
    const current = stockFor(product.id, locationId)?.[field] ?? fallback;
    return Number(edits[key]) !== Number(current);
  }

  async function saveCell(product, locationId, field, fallback) {
    const key = cellKey(product.id, locationId, field);
    const value = Number(edits[key] ?? stockFor(product.id, locationId)?.[field] ?? fallback);
    setSavingKey(key);
    const { error } = await supabase
      .from('stock_levels')
      .upsert(
        { product_id: product.id, location_id: locationId, [field]: value },
        { onConflict: 'product_id,location_id' }
      );
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
    return <p className="text-sm text-tertiary">{t('noLocationsYetHint')}</p>;
  }

  function Cell({ product, locationId, field, fallback, label }) {
    const key = cellKey(product.id, locationId, field);
    return (
      <div className="flex items-center gap-2">
        <Input
          size="sm"
          type="number"
          aria-label={label}
          value={String(fieldValue(product, locationId, field, fallback))}
          onChange={(v) => setEdits((prev) => ({ ...prev, [key]: v }))}
          className="w-24"
        />
        {isDirty(product, locationId, field, fallback) && (
          <Button
            size="sm"
            color="secondary"
            onClick={() => saveCell(product, locationId, field, fallback)}
            isLoading={savingKey === key}
          >
            {t('save')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SubHeader title={t('stockGridTitle')} />
      <div className="overflow-x-auto rounded-lg ring-1 ring-secondary ring-inset">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>{t('tableNameEn')}</th>
              {locations.map((loc) => (
                <th key={loc.id} colSpan={2} className={`${th} border-l text-secondary`}>
                  {loc.name}
                </th>
              ))}
            </tr>
            <tr>
              <th className={th}></th>
              {locations.map((loc) => (
                <Fragment key={loc.id}>
                  <th className={`${th} border-l`}>{t('priceLabel')}</th>
                  <th className={th}>{t('quantity')}</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-secondary">
                <td className={`${td} font-medium whitespace-nowrap text-primary`}>{p.name_en}</td>
                {locations.map((loc) => (
                  <Fragment key={loc.id}>
                    <td className={`${td} border-l`}>
                      {Cell({ product: p, locationId: loc.id, field: 'price', fallback: p.price, label: t('priceLabel') })}
                    </td>
                    <td className={td}>
                      {Cell({ product: p, locationId: loc.id, field: 'qty_on_hand', fallback: 0, label: t('quantity') })}
                    </td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
