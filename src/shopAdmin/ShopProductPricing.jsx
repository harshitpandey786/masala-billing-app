import { useEffect, useState } from 'react';
import { CheckCircle } from '@untitledui/icons';
import { BadgeWithIcon } from '@/components/base/badges/badges';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

const th = 'border-b border-secondary bg-secondary px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-tertiary md:px-6';
const td = 'border-b border-secondary px-4 py-3 align-middle text-sm text-tertiary md:px-6';

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

  function cell(product, field, fallback, label) {
    const key = `${product.id}:${field}`;
    return (
      <div className="flex items-center gap-2">
        <Input
          size="sm"
          type="number"
          aria-label={label}
          value={String(fieldFor(product, field, fallback))}
          onChange={(v) => setField(product.id, field, v)}
          className="w-24"
        />
        {isDirty(product, field, fallback) && (
          <Button size="sm" color="secondary" onClick={() => saveField(product, field, fallback)} isLoading={savingKey === key}>
            {t('save')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
      <div className="flex items-center justify-between gap-4 border-b border-secondary px-4 py-5 md:px-6">
        <h2 className="text-lg font-semibold text-primary">{t('shopProductPricingTitle')}</h2>
        {savedFlash && (
          <BadgeWithIcon type="pill-color" color="success" size="md" iconLeading={CheckCircle}>
            {savedFlash}
          </BadgeWithIcon>
        )}
      </div>

      {status === 'loading' && <p className="px-4 py-6 text-sm text-tertiary md:px-6">{t('loadingResults')}</p>}
      {status === 'error' && <p className="px-4 py-6 text-sm text-error-primary md:px-6">{t('loadError')}</p>}

      {status === 'ready' && products.length === 0 && (
        <p className="px-4 py-6 text-sm text-tertiary md:px-6">{t('noProductsYetHint')}</p>
      )}

      {status === 'ready' && products.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>{t('tableNameEn')}</th>
                <th className={th}>{t('priceLabel')}</th>
                <th className={th}>{t('stockHereLabel')}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-secondary">
                  <td className={`${td} font-medium text-primary`}>{p.name_en}</td>
                  <td className={td}>{cell(p, 'price', p.price, t('priceLabel'))}</td>
                  <td className={td}>{cell(p, 'qty_on_hand', 0, t('stockHereLabel'))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
