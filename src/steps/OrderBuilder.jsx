import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Check, Package, Plus, Repeat04, Trash01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { cx } from '@/utils/cx';
import { getRecipeCatalog } from '../recipeCatalog.js';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';
import { ProductThumb } from '../components/ProductThumb.jsx';
import { masalaTypeColorFor } from '../utils/masalaTypeColor.js';

function unitAbbrev(unit) {
  if (unit === 'piece') return 'pcs';
  if (unit === 'kg') return 'kg';
  return 'g';
}

// Client step 1, "understand the order": which masala and how many kilos.
// No prices here on purpose -- the estimate is shown on the final bill.
export default function OrderBuilder({ orderItems, onChange, onBack, onNext, pricingConfig, customer, reorderInfo }) {
  const { t, lang } = useLanguage();
  const catalog = useMemo(() => getRecipeCatalog(pricingConfig), [pricingConfig]);
  const types = Object.keys(catalog);
  const [type, setType] = useState(types[0]);
  const [qtyLabel, setQtyLabel] = useState(catalog[types[0]][0].qtyLabel);

  function handleTypeChange(nextType) {
    setType(nextType);
    if (!catalog[nextType].some((o) => o.qtyLabel === qtyLabel)) setQtyLabel(catalog[nextType][0].qtyLabel);
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

  const typeLabel = (ty) => masalaTypeLabel(t, ty, pricingConfig?.masala_types, lang);
  const hasCustom = orderItems.some((i) => i.kind === 'custom');
  const dateFormatter = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <PageHeader
        title={t('orderStepTitle')}
        description={customer?.name ? `${customer.name} · ${customer.phone}` : t('orderStepHint')}
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
        <section className="flex min-w-0 flex-col gap-7 rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset lg:p-7">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-primary">{t('masalaType')}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {types.map((ty) => {
                const selected = ty === type;
                const color = masalaTypeColorFor(ty);
                const sizes = catalog[ty];
                return (
                  <button
                    key={ty}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleTypeChange(ty)}
                    className={cx(
                      'flex items-center gap-4 rounded-xl p-4 text-left ring-inset transition duration-100 ease-linear',
                      selected ? 'bg-brand-primary ring-2 ring-brand' : 'bg-primary ring-1 ring-secondary hover:bg-secondary'
                    )}
                  >
                    <span
                      className={cx(
                        'flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold',
                        color.bg,
                        color.text
                      )}
                    >
                      {typeLabel(ty).charAt(0)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-lg font-bold text-primary">{typeLabel(ty)}</span>
                      <span className="text-sm text-tertiary tabular-nums">
                        {sizes.length > 1 ? `${sizes[0].qtyLabel}–${sizes[sizes.length - 1].qtyLabel}` : sizes[0].qtyLabel} kg
                      </span>
                    </span>
                    {selected && (
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-solid text-white">
                        <Check className="size-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-primary">{t('quantityKg')}</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {catalog[type].map((o) => {
                const selected = o.qtyLabel === qtyLabel;
                return (
                  <button
                    key={o.qtyLabel}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setQtyLabel(o.qtyLabel)}
                    className={cx(
                      'flex h-14 items-baseline justify-center gap-1 rounded-xl pt-3.5 tabular-nums ring-inset transition duration-100 ease-linear',
                      selected
                        ? 'bg-brand-solid text-white shadow-md'
                        : 'bg-primary text-primary ring-1 ring-secondary hover:bg-secondary'
                    )}
                  >
                    <span className="text-lg font-bold">{o.qtyLabel}</span>
                    <span className={cx('text-sm font-medium', selected ? 'text-white/80' : 'text-tertiary')}>kg</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            aria-label={`${t('addToOrder')} · ${typeLabel(type)} ${qtyLabel} kg`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-solid px-5 py-4 text-lg font-bold text-white shadow-md transition duration-150 ease-linear hover:bg-brand-solid_hover"
          >
            <Plus className="size-5 shrink-0" />
            <span>
              <span className="hidden sm:inline">{t('addToOrder')} · </span>
              {typeLabel(type)} {qtyLabel} kg
            </span>
          </button>
        </section>

        <aside className="flex flex-col rounded-2xl bg-primary shadow-xs ring-1 ring-secondary ring-inset xl:sticky xl:top-6">
          <div className="flex items-baseline gap-2 border-b border-secondary px-5 py-5">
            <h2 className="text-xl font-bold text-primary">{t('orderListTitle')}</h2>
            {orderItems.length > 0 && <span className="text-md font-semibold text-tertiary">· {orderItems.length}</span>}
          </div>

          {orderItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-fg-quaternary">
                <Package className="size-6" />
              </span>
              <p className="text-sm font-medium text-secondary">{t('noItemsYet')}</p>
            </div>
          ) : (
            <ul className="flex flex-col px-5">
              <AnimatePresence initial={false}>
                {orderItems.map((item) => {
                  const isProduct = item.kind === 'product';
                  const color = masalaTypeColorFor(item.type);
                  return (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                      className="flex items-center gap-3 border-b border-secondary py-3.5 last:border-b-0"
                    >
                      {isProduct ? (
                        <ProductThumb name={item.name} className="size-11 rounded-lg" />
                      ) : (
                        <span
                          className={cx(
                            'flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums',
                            color.bg,
                            color.text
                          )}
                        >
                          {item.qtyLabel}
                        </span>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <p className="truncate text-md font-semibold text-primary">
                          {isProduct ? item.name : `${typeLabel(item.type)} · ${item.qtyLabel} kg`}
                        </p>
                        <p className="text-sm text-tertiary tabular-nums">
                          {isProduct ? `${item.qty} ${unitAbbrev(item.unit)}` : t('customMasalaTitle')}
                        </p>
                      </div>
                      <ButtonUtility size="xs" color="tertiary" tooltip={t('remove')} icon={Trash01} onClick={() => handleRemove(item.id)} />
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}

          <div className="flex flex-col gap-3 border-t border-secondary px-5 py-5">
            <button
              type="button"
              onClick={onNext}
              className="group flex w-full items-center justify-between gap-3 rounded-xl bg-brand-solid px-5 py-4 text-left text-white shadow-md transition duration-150 ease-linear hover:bg-brand-solid_hover"
            >
              <span className="text-lg font-bold">{t('next')}</span>
              <span className="flex size-9 items-center justify-center rounded-full bg-white text-fg-brand-primary transition-transform duration-150 ease-linear group-hover:translate-x-1">
                <ArrowRight className="size-4" />
              </span>
            </button>
            <p className="text-sm text-tertiary">{hasCustom ? t('customBlendNextStep') : t('orderEmptyHint')}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
