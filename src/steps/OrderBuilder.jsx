import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'qrcode';
import { AlertCircle, ArrowLeft, ArrowRight, Minus, Package, Plus, QrCode01, Repeat04, Scan, SearchLg, Trash01, XClose } from '@untitledui/icons';
import { Badge } from '@/components/base/badges/badges';
import { ButtonGroup, ButtonGroupItem } from '@/components/base/button-group/button-group';
import { Button } from '@/components/base/buttons/button';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { Input } from '@/components/base/input/input';
import { Select } from '@/components/base/select/select';
import { cx } from '@/utils/cx';
import { getRecipeCatalog } from '../recipeCatalog.js';
import { priceRecipe } from '../pricing-engine.js';
import { listProducts, lookupProductByBarcode } from '../productLookup.js';
import { supabase } from '../supabaseClient.js';
import { remoteScanChannelName, scanPageUrl } from '../remoteScan.js';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';
import { ProductThumb } from '../components/ProductThumb.jsx';
import { masalaTypeColorFor } from '../utils/masalaTypeColor.js';

function unitAbbrev(unit) {
  if (unit === 'piece') return 'pcs';
  if (unit === 'kg') return 'kg';
  return 'g';
}

// One tap on a product adds a sensible amount for its unit; the cart's -/+
// then nudges by a finer step for things sold by weight.
const TAP_QTY = { piece: 1, kg: 1, g: 100 };
const STEP_QTY = { piece: 1, kg: 0.25, g: 50 };
const roundQty = (n) => Math.round(n * 1000) / 1000;

// Imported website products are named "Malvani Masala - Pack of 1"; show the
// pack size as its own line instead of letting it get truncated away.
function splitPackName(name) {
  const i = name.lastIndexOf(' - ');
  if (i === -1) return { base: name, pack: null };
  return { base: name.slice(0, i), pack: name.slice(i + 3) };
}

const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

function estimateCustomTotal(item, pricingConfig) {
  try {
    return priceRecipe(item.recipeKey, { config: pricingConfig }).total;
  } catch {
    return null;
  }
}

const card = 'rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset';

function ProductScanner({ orderItems, onAdd, locationId }) {
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
    <section className={card}>
      <div className="flex flex-col gap-1 border-b border-secondary px-5 py-4 lg:px-6">
        <h2 className="text-lg font-semibold text-primary">{t('readyMadeProductsTitle')}</h2>
        <p className="text-sm text-tertiary">{t('readyMadeProductsHint')}</p>
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
                      <p className="text-xs text-tertiary">
                        {t('remoteScanFoundHint')} · {inr(scan.product.price)}
                      </p>
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
                    <span className="text-sm font-medium text-secondary tabular-nums">
                      {inr(p.price)}
                      {p.unit !== 'piece' && ` / ${unitAbbrev(p.unit)}`}
                    </span>
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

export default function OrderBuilder({
  orderItems,
  onChange,
  onBack,
  onNext,
  pricingConfig,
  locationId,
  customer,
  reorderInfo,
}) {
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

  function addProduct(product) {
    const add = TAP_QTY[product.unit] ?? 1;
    const existing = orderItems.find((i) => i.kind === 'product' && i.productId === product.id);
    if (existing) {
      onChange(orderItems.map((i) => (i.id === existing.id ? { ...i, qty: roundQty(i.qty + add) } : i)));
      return;
    }
    onChange([
      ...orderItems,
      {
        id: crypto.randomUUID(),
        kind: 'product',
        productId: product.id,
        name: product.name_en,
        unit: product.unit,
        qty: add,
        unitPrice: Number(product.price),
      },
    ]);
  }

  function changeQty(item, delta) {
    const next = roundQty(item.qty + delta);
    if (next <= 0) {
      handleRemove(item.id);
      return;
    }
    onChange(orderItems.map((i) => (i.id === item.id ? { ...i, qty: next } : i)));
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

  const selectedOption = catalog[type]?.find((o) => o.qtyLabel === qtyLabel);
  const selectedEstimate = selectedOption ? estimateCustomTotal(selectedOption, pricingConfig) : null;
  const typeLabel = (ty) => masalaTypeLabel(t, ty, pricingConfig?.masala_types, lang);
  const dateFormatter = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <PageHeader
        title={t('orderBuilderTitle')}
        description={customer?.name ? `${customer.name} · ${customer.phone}` : undefined}
        actions={
          <Button color="secondary" size="md" iconLeading={ArrowLeft} onClick={onBack}>
            {t('back')}
          </Button>
        }
      />

      {reorderInfo && (
        <div className="px-4 pt-6 lg:px-8">
          <div className="flex items-start gap-3 rounded-xl bg-brand-primary px-4 py-3 ring-1 ring-brand ring-inset">
            <Repeat04 className="mt-0.5 size-5 shrink-0 text-fg-brand-primary" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-primary">
                {t('reorderBannerTitle')}{' '}
                {reorderInfo.fromDate && (
                  <span className="font-normal text-tertiary">
                    · {t('reorderFromLabel')} {dateFormatter.format(new Date(reorderInfo.fromDate))}
                  </span>
                )}
              </p>
              {reorderInfo.skipped > 0 && (
                <p className="text-sm text-tertiary">
                  {reorderInfo.skipped} {t('reorderSkippedLabel')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 px-4 pt-8 lg:px-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className={card}>
            <div className="flex flex-col gap-1 border-b border-secondary px-5 py-4 lg:px-6">
              <h2 className="text-lg font-semibold text-primary">{t('customMasalaTitle')}</h2>
              <p className="text-sm text-tertiary">{t('customMasalaHint')}</p>
            </div>
            <div className="flex flex-col gap-5 p-5 lg:p-6">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-secondary">{t('masalaType')}</span>
                <ButtonGroup
                  size="md"
                  selectedKeys={[type]}
                  onSelectionChange={(keys) => {
                    const next = [...keys][0];
                    if (next) handleTypeChange(String(next));
                  }}
                  className="flex-wrap"
                >
                  {types.map((ty) => (
                    <ButtonGroupItem key={ty} id={ty}>
                      {typeLabel(ty)}
                    </ButtonGroupItem>
                  ))}
                </ButtonGroup>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <Select
                  label={t('quantityKg')}
                  items={catalog[type].map((o) => ({ id: o.qtyLabel, label: `${o.qtyLabel} kg` }))}
                  selectedKey={qtyLabel}
                  onSelectionChange={(key) => key && setQtyLabel(String(key))}
                  className="sm:w-44"
                >
                  {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
                <div className="flex flex-1 flex-col gap-0.5 sm:pb-2.5">
                  <span className="text-sm text-tertiary">{t('estimatedPrice')}</span>
                  <span className="text-lg font-semibold text-primary tabular-nums">
                    {selectedEstimate != null ? inr(selectedEstimate) : '—'}
                  </span>
                </div>
                <Button size="lg" iconLeading={Plus} onClick={handleAdd}>
                  {t('addItem').replace(/^\+\s*/, '')}
                </Button>
              </div>
            </div>
          </section>

          <ProductScanner orderItems={orderItems} onAdd={addProduct} locationId={locationId} />
        </div>

        <aside className={cx(card, 'flex flex-col xl:sticky xl:top-6')}>
          <div className="flex items-center justify-between gap-3 border-b border-secondary px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-primary">{t('currentBill')}</h2>
              <Badge size="sm" type="modern" color="gray">
                {orderItems.length}
              </Badge>
            </div>
          </div>

          {orderItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-fg-quaternary">
                <Package className="size-5" />
              </span>
              <p className="text-sm text-tertiary">{t('noItemsYet')}</p>
            </div>
          ) : (
            <ul className="flex flex-col px-5">
              <AnimatePresence initial={false}>
                {orderItems.map((item) => {
                  const isProduct = item.kind === 'product';
                  const amount = isProduct ? item.qty * item.unitPrice : estimateCustomTotal(item, pricingConfig);
                  const step = STEP_QTY[item.unit] ?? 1;
                  return (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                      className="flex items-center gap-3 border-b border-secondary py-3 last:border-b-0"
                    >
                      {isProduct ? (
                        <ProductThumb name={item.name} className="size-10 rounded-lg" />
                      ) : (
                        <span
                          className={cx(
                            'flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
                            masalaTypeColorFor(item.type).bg,
                            masalaTypeColorFor(item.type).text
                          )}
                        >
                          {item.qtyLabel}
                        </span>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="truncate text-sm font-medium text-primary">
                          {isProduct ? item.name : `${typeLabel(item.type)} · ${item.qtyLabel} kg`}
                        </p>
                        {isProduct ? (
                          <div className="flex items-center gap-1.5">
                            <ButtonUtility
                              size="xs"
                              color="secondary"
                              tooltip={t('decreaseQty')}
                              icon={Minus}
                              onClick={() => changeQty(item, -step)}
                            />
                            <span className="min-w-8 text-center text-sm font-semibold text-primary tabular-nums">
                              {item.qty}
                              {item.unit !== 'piece' && <span className="font-normal text-tertiary"> {unitAbbrev(item.unit)}</span>}
                            </span>
                            <ButtonUtility
                              size="xs"
                              color="secondary"
                              tooltip={t('increaseQty')}
                              icon={Plus}
                              onClick={() => changeQty(item, step)}
                            />
                            <span className="text-xs text-tertiary tabular-nums">× {inr(item.unitPrice)}</span>
                          </div>
                        ) : (
                          <p className="text-xs text-tertiary">{t('customBlendEstimate')}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-primary tabular-nums">{amount != null ? inr(amount) : '—'}</p>
                      <ButtonUtility size="xs" color="tertiary" tooltip={t('remove')} icon={Trash01} onClick={() => handleRemove(item.id)} />
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}

          <div className="flex items-baseline justify-between border-t border-secondary bg-secondary px-5 py-4">
            <span className="text-sm font-semibold text-primary">{t('cartTotalLabel')}</span>
            <span className="text-display-xs font-semibold text-primary tabular-nums">{inr(cartTotal)}</span>
          </div>

          <div className="flex flex-col gap-2 border-t border-secondary px-5 py-4">
            <Button size="lg" iconTrailing={ArrowRight} isDisabled={orderItems.length === 0} onClick={onNext} className="w-full">
              {t('next')}
            </Button>
            {orderItems.some((i) => i.kind === 'custom') && (
              <p className="flex items-center gap-1.5 text-xs text-tertiary">
                <AlertCircle className="size-3.5 shrink-0" />
                {t('customBlendNextStep')}
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
