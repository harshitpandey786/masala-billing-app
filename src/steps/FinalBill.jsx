import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Edit03, Minus, Package, Plus, Trash01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { cx } from '@/utils/cx';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';
import ProductScanner from '../components/ProductScanner.jsx';
import { ProductThumb } from '../components/ProductThumb.jsx';
import { masalaTypeColorFor } from '../utils/masalaTypeColor.js';
import { STEP_QTY, addProductItem, roundQty, unitAbbrev } from '../orderItems.js';

const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');


export function itemAmount(item, proformaBills) {
  if (item.kind === 'product') return Math.round(item.qty * item.unitPrice);
  return proformaBills[item.id]?.total ?? 0;
}

// Client steps 4 and 5: show the customer the final bill with its estimated
// price (Change goes back to that masala's proforma), and add anything extra
// into this same bill before confirming.
export default function FinalBill({ orderItems, proformaBills, onChange, onEditItem, onBack, onNext, pricingConfig, locationId }) {
  const { t, lang } = useLanguage();
  const typeLabel = (ty) => masalaTypeLabel(t, ty, pricingConfig?.masala_types, lang);
  const total = orderItems.reduce((sum, item) => sum + itemAmount(item, proformaBills), 0);

  function addProduct(product) {
    onChange(addProductItem(orderItems, product));
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

  return (
    <>
      <PageHeader
        title={t('finalBillTitle')}
        description={t('finalBillHint')}
        actions={
          <Button color="secondary" size="md" iconLeading={ArrowLeft} onClick={onBack}>
            {t('back')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 px-4 pt-8 lg:px-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-2xl bg-primary shadow-xs ring-1 ring-secondary ring-inset xl:col-start-1">
          <div className="flex items-baseline gap-2 border-b border-secondary px-5 py-5 lg:px-6">
            <h2 className="text-xl font-bold text-primary">{t('orderListTitle')}</h2>
            {orderItems.length > 0 && <span className="text-md font-semibold text-tertiary">· {orderItems.length}</span>}
          </div>

          {orderItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-fg-quaternary">
                <Package className="size-6" />
              </span>
              <p className="max-w-sm text-sm font-medium text-secondary">{t('finalBillEmpty')}</p>
            </div>
          ) : (
            <ul className="flex flex-col px-5 lg:px-6">
              <AnimatePresence initial={false}>
                {orderItems.map((item) => {
                  const isProduct = item.kind === 'product';
                  const color = masalaTypeColorFor(item.type);
                  const step = STEP_QTY[item.unit] ?? 1;
                  return (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                      className="flex flex-col gap-2.5 border-b border-secondary py-4 last:border-b-0"
                    >
                      <div className="flex items-center gap-4">
                        {isProduct ? (
                          <ProductThumb name={item.name} className="size-12 rounded-lg" />
                        ) : (
                          <span
                            className={cx(
                              'flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums',
                              color.bg,
                              color.text
                            )}
                          >
                            {item.qtyLabel}
                          </span>
                        )}
                        <p className="min-w-0 flex-1 text-md font-semibold text-primary">
                          {isProduct ? item.name : `${typeLabel(item.type)} · ${item.qtyLabel} kg`}
                        </p>
                        {!isProduct && (
                          <Button
                            color="secondary"
                            size="sm"
                            iconLeading={Edit03}
                            onClick={() => onEditItem(item.id)}
                            aria-label={t('changeItem')}
                            className="shrink-0"
                          >
                            <span className="hidden sm:inline">{t('changeItem')}</span>
                          </Button>
                        )}
                        <p className="shrink-0 text-lg font-bold text-primary tabular-nums">{inr(itemAmount(item, proformaBills))}</p>
                      </div>

                      {isProduct && (
                        <div className="flex items-center justify-between gap-3 sm:pl-16">
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
                          </div>
                          <ButtonUtility size="xs" color="tertiary" tooltip={t('remove')} icon={Trash01} onClick={() => handleRemove(item.id)} />
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </section>

        {/* Second in the DOM so on narrower screens the total and Confirm sit
            right under the bill, not below the whole product grid. */}
        <aside className="flex flex-col gap-5 rounded-2xl bg-brand-solid p-6 text-white shadow-md xl:sticky xl:top-6 xl:col-start-2 xl:row-span-2 xl:row-start-1">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-white/80">{t('estimatedTotal')}</p>
            <p className="text-display-md font-bold tabular-nums">{inr(total)}</p>
          </div>
          <button
            type="button"
            disabled={orderItems.length === 0}
            onClick={onNext}
            className="group flex w-full items-center justify-between gap-3 rounded-xl bg-white px-5 py-4 text-left text-fg-brand-primary shadow-sm transition duration-150 ease-linear hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-lg font-bold">{t('stepConfirm')}</span>
            <ArrowRight className="size-5 transition-transform duration-150 ease-linear group-hover:translate-x-1" />
          </button>
          <p className="text-sm text-white/75">{t('billIsFinalHint')}</p>
        </aside>

        <div className="min-w-0 xl:col-start-1">
          <ProductScanner
            orderItems={orderItems}
            onAdd={addProduct}
            locationId={locationId}
            title={t('addExtraTitle')}
            hint={t('addExtraHint')}
          />
        </div>
      </div>
    </>
  );
}
