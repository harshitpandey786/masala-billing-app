import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

// This shop's own price + stock for every active ready-made/loose product.
// The product catalog itself (name, barcode, unit) is shared across shops
// and stays owner-only (see AdminProducts.jsx) -- this only ever touches
// `stock_levels` rows for this one `locationId`, which is where per-shop
// price now lives (see docs/supabase-setup.md §9).
export default function ShopProductPricing({ locationId }) {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [stockLevels, setStockLevels] = useState([]);
  const [status, setStatus] = useState(supabase ? 'loading' : 'not_configured');
  const [edits, setEdits] = useState({});
  const [savingKey, setSavingKey] = useState(null);
  const [savedFlash, setSavedFlash] = useState('');

  async function loadAll() {
    if (!supabase) return;
    setStatus('loading');
    const [p, s] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name_en'),
      supabase.from('stock_levels').select('*').eq('location_id', locationId),
    ]);
    if (p.error || s.error) {
      console.error('Failed to load shop product pricing', p.error || s.error);
      setStatus('error');
      return;
    }
    setProducts(p.data || []);
    setStockLevels(s.data || []);
    setStatus('ready');
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  function stockFor(productId) {
    return stockLevels.find((s) => s.product_id === productId);
  }
  function fieldFor(product, field, fallback) {
    const key = `${product.id}:${field}`;
    if (edits[key] !== undefined) return edits[key];
    const stock = stockFor(product.id);
    return stock?.[field] ?? fallback;
  }
  function setField(productId, field, value) {
    setEdits((prev) => ({ ...prev, [`${productId}:${field}`]: value }));
  }
  function isDirty(product, field, fallback) {
    const key = `${product.id}:${field}`;
    if (edits[key] === undefined) return false;
    const stock = stockFor(product.id);
    return Number(edits[key]) !== Number(stock?.[field] ?? fallback);
  }

  async function saveField(product, field, fallback) {
    const key = `${product.id}:${field}`;
    const value = Number(edits[key] ?? stockFor(product.id)?.[field] ?? fallback);
    setSavingKey(key);
    const { error } = await supabase
      .from('stock_levels')
      .upsert({ product_id: product.id, location_id: locationId, [field]: value }, { onConflict: 'product_id,location_id' });
    setSavingKey(null);
    if (error) {
      console.error('Failed to save shop product pricing', error);
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    loadAll();
    setSavedFlash(t('saved'));
    setTimeout(() => setSavedFlash(''), 1500);
  }

  if (status === 'not_configured') return null;

  return (
    <section className="card admin-dashboard pricing-manager">
      <h2>{t('shopProductPricingTitle')}</h2>

      {status === 'loading' && <p className="hint">{t('loadingResults')}</p>}
      {status === 'error' && <p className="form-error">{t('loadError')}</p>}

      {status === 'ready' && (
        <div className="pricing-section">
          {savedFlash && <p className="pricing-saved-flash">{savedFlash}</p>}

          {products.length === 0 && <p className="hint">{t('noProductsYetHint')}</p>}

          {products.length > 0 && (
            <div className="table-scroll">
              <table className="bill-table ledger-table">
                <thead>
                  <tr>
                    <th>{t('tableNameEn')}</th>
                    <th>{t('priceLabel')}</th>
                    <th>{t('stockHereLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="ledger-row">
                      <td>{p.name_en}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={fieldFor(p, 'price', p.price)}
                          onChange={(e) => setField(p.id, 'price', e.target.value)}
                          className="pricing-cell-input pricing-cell-input-narrow"
                        />
                        {isDirty(p, 'price', p.price) && (
                          <button
                            className="btn-secondary btn-small"
                            onClick={() => saveField(p, 'price', p.price)}
                            disabled={savingKey === `${p.id}:price`}
                          >
                            {t('save')}
                          </button>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={fieldFor(p, 'qty_on_hand', 0)}
                          onChange={(e) => setField(p.id, 'qty_on_hand', e.target.value)}
                          className="pricing-cell-input pricing-cell-input-narrow"
                        />
                        {isDirty(p, 'qty_on_hand', 0) && (
                          <button
                            className="btn-secondary btn-small"
                            onClick={() => saveField(p, 'qty_on_hand', 0)}
                            disabled={savingKey === `${p.id}:qty_on_hand`}
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
          )}
        </div>
      )}
    </section>
  );
}
