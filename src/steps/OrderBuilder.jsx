import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowLeft, ArrowRight, Package, Plus, Scan, SearchLg, Trash01 } from '@untitledui/icons';
import { Badge, BadgeWithDot } from '@/components/base/badges/badges';
import { ButtonGroup, ButtonGroupItem } from '@/components/base/button-group/button-group';
import { Button } from '@/components/base/buttons/button';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { Input } from '@/components/base/input/input';
import { Select } from '@/components/base/select/select';
import { cx } from '@/utils/cx';
import { getRecipeCatalog } from '../recipeCatalog.js';
import { priceRecipe } from '../pricing-engine.js';
import { listProducts, lookupProductByBarcode, searchProductsByName } from '../productLookup.js';
import { productImageFor } from '../productImages.js';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';

function unitAbbrev(unit) {
  if (unit === 'piece') return 'pcs';
  if (unit === 'kg') return 'kg';
  return 'g';
}

const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

function estimateCustomTotal(item, pricingConfig) {
  try {
    return priceRecipe(item.recipeKey, { config: pricingConfig }).total;
  } catch {
    return null;
  }
}

const POP = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] },
  style: { transformOrigin: 'top' },
};

function ProductThumb({ name, className }) {
  const src = productImageFor(name);
  if (src) {
    return <img src={src} alt="" className={cx('shrink-0 object-cover ring-1 ring-secondary ring-inset', className)} />;
  }
  return (
    <span className={cx('flex shrink-0 items-center justify-center bg-secondary text-fg-quaternary', className)}>
      <Package className="size-5" />
    </span>
  );
}

const card = 'rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset';

function ProductScanner({ orderItems, onChange, locationId }) {
  const { t } = useLanguage();
  const [barcode, setBarcode] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [matches, setMatches] = useState([]);
  const [pending, setPending] = useState(null); // the scanned/selected product, awaiting qty + Add
  const [qty, setQty] = useState('1');
  const [notFound, setNotFound] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const barcodeInputRef = useRef(null);

  // Keeps the scan field focused between scans so a USB/Bluetooth barcode
  // scanner (which just "types" the code + Enter) can be used back-to-back
  // without the operator clicking back into the field each time.
  useEffect(() => {
    if (!pending) barcodeInputRef.current?.focus();
  }, [pending]);

  useEffect(() => {
    let cancelled = false;
    listProducts(locationId).then((rows) => {
      if (!cancelled) setAllProducts(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [locationId]);

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
    setQty('1');
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
    setQty('1');
    setNameSearch('');
    setMatches([]);
  }

  function cancelPending() {
    setPending(null);
    setNotFound(false);
  }

  function handleAddPending() {
    const n = Number(qty);
    if (!pending || !n || n <= 0) return;
    onChange([
      ...orderItems,
      {
        id: crypto.randomUUID(),
        kind: 'product',
        productId: pending.id,
        name: pending.name_en,
        unit: pending.unit,
        qty: n,
        unitPrice: Number(pending.price),
      },
    ]);
    setPending(null);
  }

  const inBill = useMemo(() => {
    const m = new Map();
    for (const item of orderItems) if (item.kind === 'product') m.set(item.productId, (m.get(item.productId) || 0) + item.qty);
    return m;
  }, [orderItems]);

  return (
    <section className={card}>
      <div className="flex flex-col gap-1 border-b border-secondary px-5 py-4 lg:px-6">
        <h2 className="text-lg font-semibold text-primary">{t('readyMadeProductsTitle')}</h2>
        <p className="text-sm text-tertiary">{t('readyMadeProductsHint')}</p>
      </div>

      <div className="flex flex-col gap-4 p-5 lg:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            ref={barcodeInputRef}
            label={t('scanBarcodeLabel')}
            icon={Scan}
            value={barcode}
            onChange={setBarcode}
            onKeyDown={handleBarcodeKeyDown}
            placeholder={t('scanBarcodePlaceholder')}
            isDisabled={!!pending}
            isInvalid={notFound}
            hint={notFound ? t('unknownBarcode') : undefined}
          />
          <div className="relative">
            <Input
              label={t('searchProductLabel')}
              icon={SearchLg}
              value={nameSearch}
              onChange={setNameSearch}
              placeholder={t('searchProductPlaceholder')}
              isDisabled={!!pending}
            />
            <AnimatePresence>
              {matches.length > 0 && (
                <motion.ul
                  {...POP}
                  className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-80 overflow-auto rounded-lg bg-primary py-1 shadow-lg ring-1 ring-secondary"
                >
                  {matches.map((m) => (
                    <li key={m.id} className="px-1.5">
                      <button
                        type="button"
                        onClick={() => selectMatch(m)}
                        className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition duration-100 ease-linear hover:bg-primary_hover"
                      >
                        <ProductThumb name={m.name_en} className="size-9 rounded-md" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{m.name_en}</span>
                        <span className="text-sm text-tertiary tabular-nums">
                          {inr(m.price)}/{unitAbbrev(m.unit)}
                        </span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {pending && (
            <motion.div {...POP} className="flex flex-col gap-4 rounded-xl bg-secondary p-4 ring-1 ring-secondary ring-inset sm:flex-row sm:items-end">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <ProductThumb name={pending.name_en} className="size-14 rounded-lg" />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-md font-semibold text-primary">{pending.name_en}</p>
                  <p className="text-sm text-tertiary tabular-nums">
                    {inr(pending.price)} / {unitAbbrev(pending.unit)}
                  </p>
                  {pending.qtyOnHand != null && (
                    <BadgeWithDot size="sm" type="modern" color={pending.qtyOnHand > 0 ? 'success' : 'error'}>
                      {pending.qtyOnHand > 0 ? `${t('stockHereLabel')}: ${pending.qtyOnHand}` : t('outOfStockWarning')}
                    </BadgeWithDot>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-3">
                <Input
                  label={`${t('quantity')} (${unitAbbrev(pending.unit)})`}
                  type="number"
                  inputMode="decimal"
                  value={String(qty)}
                  onChange={setQty}
                  className="w-28"
                  autoFocus
                />
                <Button color="secondary" size="md" onClick={cancelPending}>
                  {t('cancel')}
                </Button>
                <Button size="md" iconLeading={Plus} onClick={handleAddPending}>
                  {t('addItem').replace(/^\+\s*/, '')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {allProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
            {allProducts.map((p) => {
              const count = inBill.get(p.id) || 0;
              const out = p.qtyOnHand != null && p.qtyOnHand <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!!pending}
                  onClick={() => selectMatch(p)}
                  className="group flex flex-col overflow-hidden rounded-xl bg-primary text-left shadow-xs ring-1 ring-secondary ring-inset transition duration-100 ease-linear hover:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="relative block aspect-square bg-secondary">
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
                  </span>
                  <span className="flex flex-col gap-0.5 p-3">
                    <span className="truncate text-sm font-semibold text-primary">{p.name_en}</span>
                    <span className="text-sm text-tertiary tabular-nums">
                      {inr(p.price)} / {unitAbbrev(p.unit)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function OrderBuilder({ orderItems, onChange, onBack, onNext, pricingConfig, locationId, customer }) {
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

  const selectedOption = catalog[type]?.find((o) => o.qtyLabel === qtyLabel);
  const selectedEstimate = selectedOption ? estimateCustomTotal(selectedOption, pricingConfig) : null;
  const typeLabel = (ty) => masalaTypeLabel(t, ty, pricingConfig?.masala_types, lang);

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

          <ProductScanner orderItems={orderItems} onChange={onChange} locationId={locationId} />
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
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-secondary text-xs font-semibold text-brand-secondary">
                          {item.qtyLabel}
                        </span>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-sm font-medium text-primary">
                          {isProduct ? item.name : `${typeLabel(item.type)} · ${item.qtyLabel} kg`}
                        </p>
                        <p className="text-xs text-tertiary tabular-nums">
                          {isProduct ? `${item.qty} ${unitAbbrev(item.unit)} × ${inr(item.unitPrice)}` : t('customBlendEstimate')}
                        </p>
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
              {t('generateBills')}
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
