import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Plus, QrCode01, Scan, SearchLg, XClose } from '@untitledui/icons';
import { Badge } from '@/components/base/badges/badges';
import { Button } from '@/components/base/buttons/button';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { Input } from '@/components/base/input/input';
import { cx } from '@/utils/cx';
import { listProducts, lookupProductByBarcode } from '../productLookup.js';
import { supabase } from '../supabaseClient.js';
import { remoteScanChannelName, scanPageUrl } from '../remoteScan.js';
import { useLanguage } from '../i18n.jsx';
import { ProductThumb } from './ProductThumb.jsx';

// Imported website products are named "Malvani Masala - Pack of 1"; show the
// pack size as its own line instead of letting it get truncated away.
function splitPackName(name) {
  const i = name.lastIndexOf(' - ');
  if (i === -1) return { base: name, pack: null };
  return { base: name.slice(0, i), pack: name.slice(i + 3) };
}

// Ready-made and loose products, picked by tap, hardware barcode scanner, or
// a phone scanning over the QR. Prices are deliberately left off the cards --
// the client only wants amounts shown once the final bill is on screen.
export default function ProductScanner({ orderItems, onAdd, locationId, title, hint }) {
  const { t } = useLanguage();
  const [barcode, setBarcode] = useState('');
  const [filter, setFilter] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [allProducts, setAllProducts] = useState(null);
  const [pendingScans, setPendingScans] = useState([]);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const barcodeInputRef = useRef(null);

  // A USB/Bluetooth scanner just "types" the code + Enter, so the scan field
  // starts focused and keeps focus between scans.
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    listProducts(locationId).then((rows) => {
      if (!cancelled) setAllProducts(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  // Barcodes scanned on a phone (opened via the QR below) arrive here over a
  // Supabase Realtime broadcast channel scoped to this shop. Each one is
  // looked up and held as a card so the cashier confirms the Add -- unlike
  // the hardware scanner above, a phone scan isn't auto-added straight away.
  useEffect(() => {
    if (!supabase || !locationId) return;
    const channel = supabase.channel(remoteScanChannelName(locationId));
    channel.on('broadcast', { event: 'scan' }, async ({ payload }) => {
      const code = payload?.code;
      if (!code) return;
      const id = `${Date.now()}-${Math.random()}`;
      setPendingScans((prev) => [...prev, { id, code, product: null, loading: true }]);
      const product = await lookupProductByBarcode(code, locationId);
      setPendingScans((prev) => prev.map((p) => (p.id === id ? { ...p, product, loading: false } : p)));
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId]);

  useEffect(() => {
    if (!phoneModalOpen || !locationId) return;
    let cancelled = false;
    QRCode.toDataURL(scanPageUrl(locationId), { margin: 1, width: 240 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [phoneModalOpen, locationId]);

  function dismissPendingScan(id) {
    setPendingScans((prev) => prev.filter((p) => p.id !== id));
  }

  function addPendingScan(scan) {
    onAdd(scan.product);
    dismissPendingScan(scan.id);
  }

  async function copyPhoneLink() {
    try {
      await navigator.clipboard.writeText(scanPageUrl(locationId));
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      // Clipboard unavailable -- the QR above still works.
    }
  }

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
    onAdd(product);
  }

  const visible = useMemo(() => {
    if (!allProducts) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(
      (p) => p.name_en.toLowerCase().includes(q) || (p.name_mr || '').toLowerCase().includes(q)
    );
  }, [allProducts, filter]);

  const inBill = useMemo(() => {
    const m = new Map();
    for (const item of orderItems) if (item.kind === 'product') m.set(item.productId, (m.get(item.productId) || 0) + item.qty);
    return m;
  }, [orderItems]);

  return (
    <>
      <section className="rounded-2xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex flex-col gap-1 border-b border-secondary px-5 py-5 lg:px-6">
          <h2 className="text-xl font-bold text-primary">{title}</h2>
          <p className="text-sm text-tertiary">{hint}</p>
        </div>

        <div className="flex flex-col gap-4 p-5 lg:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  ref={barcodeInputRef}
                  label={t('scanBarcodeLabel')}
                  icon={Scan}
                  value={barcode}
                  onChange={(v) => {
                    setBarcode(v);
                    setNotFound(false);
                  }}
                  onKeyDown={handleBarcodeKeyDown}
                  placeholder={t('scanBarcodePlaceholder')}
                  isInvalid={notFound}
                  hint={notFound ? t('unknownBarcode') : undefined}
                />
              </div>
              {locationId && (
                <Button color="secondary" size="md" iconLeading={QrCode01} onClick={() => setPhoneModalOpen(true)}>
                  {t('scanWithPhoneButton')}
                </Button>
              )}
            </div>
            <Input
              label={t('searchProductLabel')}
              icon={SearchLg}
              value={filter}
              onChange={setFilter}
              placeholder={t('searchProductPlaceholder')}
            />
          </div>

          {pendingScans.length > 0 && (
            <div className="flex flex-col gap-2">
              {pendingScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-3 ring-1 ring-secondary ring-inset"
                >
                  <Scan className="size-4 shrink-0 text-tertiary" />
                  <div className="min-w-0 flex-1">
                    {scan.loading ? (
                      <p className="text-sm text-tertiary">{t('loadingResults')}</p>
                    ) : scan.product ? (
                      <>
                        <p className="truncate text-sm font-medium text-primary">{scan.product.name_en}</p>
                        <p className="text-xs text-tertiary">{t('remoteScanFoundHint')}</p>
                      </>
                    ) : (
                      <p className="text-sm text-tertiary">
                        {t('remoteScanNotFoundHint')} ({scan.code})
                      </p>
                    )}
                  </div>
                  {!scan.loading && scan.product && (
                    <Button size="sm" color="primary" onClick={() => addPendingScan(scan)}>
                      {t('addItem')}
                    </Button>
                  )}
                  <ButtonUtility size="sm" color="tertiary" icon={XClose} onClick={() => dismissPendingScan(scan.id)} />
                </div>
              ))}
            </div>
          )}

          {allProducts === null && <p className="py-6 text-center text-sm text-tertiary">{t('loadingResults')}</p>}

          {allProducts !== null && visible.length === 0 && (
            <p className="py-6 text-center text-sm text-tertiary">{filter ? t('noProductMatch') : t('noProductsYetHint')}</p>
          )}

          {visible.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {visible.map((p) => {
                const count = inBill.get(p.id) || 0;
                // Ready-made packets are always sellable at the counter; only a
                // loose item whose count has actually been entered and hit zero
                // is flagged.
                const out = p.category !== 'ready_made' && p.qtyOnHand != null && p.qtyOnHand <= 0;
                const { base, pack } = splitPackName(p.name_en);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onAdd(p)}
                    className={cx(
                      'group flex flex-col overflow-hidden rounded-xl bg-primary text-left shadow-xs ring-1 ring-inset transition duration-100 ease-out active:scale-[0.98]',
                      count > 0 ? 'ring-2 ring-brand' : 'ring-secondary hover:ring-primary'
                    )}
                  >
                    <span className="relative block aspect-[4/3] bg-secondary">
                      <ProductThumb name={p.name_en} className="size-full ring-0" />
                      <span className="absolute top-2 left-2 flex gap-1">
                        {count > 0 && (
                          <Badge size="sm" type="color" color="brand">
                            {count} {t('inBillShort')}
                          </Badge>
                        )}
                        {out && (
                          <Badge size="sm" type="color" color="error">
                            {t('outOfStockShort')}
                          </Badge>
                        )}
                      </span>
                      <span className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-brand-solid text-white shadow-md transition duration-100 ease-out group-hover:scale-110">
                        <Plus className="size-4" />
                      </span>
                    </span>
                    <span className="flex flex-col gap-0.5 p-3">
                      <span className="line-clamp-2 text-sm font-semibold text-primary">{base}</span>
                      {pack && <span className="truncate text-xs text-tertiary">{pack}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {phoneModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/70 px-4 backdrop-blur-[6px]"
          onClick={() => setPhoneModalOpen(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-primary p-6 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex w-full items-center justify-between">
              <h3 className="text-md font-semibold text-primary">{t('scanWithPhoneModalTitle')}</h3>
              <ButtonUtility size="sm" color="tertiary" icon={XClose} onClick={() => setPhoneModalOpen(false)} />
            </div>
            <p className="text-sm text-tertiary">{t('scanWithPhoneModalHint')}</p>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="" className="size-60 rounded-lg ring-1 ring-secondary" />
            ) : (
              <div className="flex size-60 items-center justify-center text-sm text-tertiary">{t('loadingResults')}</div>
            )}
            <Button color="secondary" size="md" className="w-full" onClick={copyPhoneLink}>
              {linkCopied ? t('linkCopied') : t('copyLink')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
