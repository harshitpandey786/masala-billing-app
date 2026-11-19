import { useMemo, useState } from 'react';
import { ArrowRight, MessageTextSquare01, Plus, XClose } from '@untitledui/icons';
import { Badge } from '@/components/base/badges/badges';
import { Button } from '@/components/base/buttons/button';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { Input } from '@/components/base/input/input';
import { Select } from '@/components/base/select/select';
import { priceRecipe } from '../pricing-engine.js';
import { getAddonIngredientCodes, getCoreChiliRowCodes } from '../recipeCatalog.js';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';
import { cx } from '@/utils/cx';
import PageHeader from '../components/shell/PageHeader.jsx';
import BackButton from '../components/shell/BackButton.jsx';
import { SPICE_LEVELS, applySpiceLevel, detailsParts } from '../masalaDetails.js';

const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// A plain <table> on purpose: rows hold live number inputs, and a grid with
// its own arrow-key navigation would steal keystrokes mid-edit.
const th = 'px-4 py-3 text-left text-xs font-semibold text-quaternary lg:px-6';
const td = 'px-4 py-3 text-sm text-tertiary lg:px-6';

function QtyInput({ value, unit, onChange, label }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label={label}
        type="number"
        inputMode="decimal"
        size="sm"
        value={String(value)}
        onChange={onChange}
        className="w-24"
      />
      <span className="text-xs text-quaternary">{unit}</span>
    </div>
  );
}

function BaseLineRow({ line, overrides, onChangeQty }) {
  return (
    <tr className="border-t border-secondary">
      <td className={`${td} font-medium text-primary`}>{line.code}</td>
      <td className={td}>
        <QtyInput
          label={line.code}
          value={overrides[line.code] != null ? overrides[line.code] : line.qty}
          unit={line.unit === 'piece' ? 'pcs' : 'g'}
          onChange={(v) => onChangeQty(line.code, v)}
        />
      </td>
    </tr>
  );
}

export default function BillGenerator({
  orderItem,
  itemNumber,
  itemCount,
  isLast,
  initialEdits,
  details,
  onConfirm,
  onBack,
  pricingConfig,
}) {
  const { t, lang } = useLanguage();
  const addonCodes = useMemo(() => getAddonIngredientCodes(pricingConfig), [pricingConfig]);
  const coreChiliCodes = useMemo(() => getCoreChiliRowCodes(pricingConfig), [pricingConfig]);
  const recipe = pricingConfig?.recipes?.[orderItem.recipeKey];
  // First time in, start at the spice level asked for in step 2 (if any);
  // coming back from the final bill, keep exactly what was left here.
  const [spice, setSpice] = useState(initialEdits ? (initialEdits.spice ?? null) : (details?.spice ?? null));
  const [overrides, setOverrides] = useState(() =>
    initialEdits?.overrides ?? (details?.spice ? applySpiceLevel({}, recipe, coreChiliCodes, details.spice) : {})
  );
  const [additions, setAdditions] = useState(initialEdits?.additions ?? []);
  const [addCode, setAddCode] = useState(addonCodes[0] || '');
  const [addQty, setAddQty] = useState('');
  const [makingChargeOverride, setMakingChargeOverride] = useState(initialEdits?.makingChargeOverride ?? null);
  const [confirming, setConfirming] = useState(false);

  const result = priceRecipe(orderItem.recipeKey, {
    overrides,
    additions: additions.map(({ code, qty }) => ({ code, qty })),
    makingChargeOverride: makingChargeOverride != null ? makingChargeOverride : undefined,
    config: pricingConfig,
  });

  function updateOverride(code, rawValue) {
    const qty = rawValue === '' ? 0 : Number(rawValue);
    setOverrides({ ...overrides, [code]: qty });
    // Hand-editing a chilli row means the level no longer describes it.
    if (coreChiliCodes.includes(code)) setSpice(null);
  }

  function chooseSpice(levelId) {
    setSpice(levelId);
    setOverrides(applySpiceLevel(overrides, recipe, coreChiliCodes, levelId));
  }

  function handleAddIngredient() {
    const qty = Number(addQty);
    if (!addCode || !qty || qty <= 0) return;
    const existing = additions.find((a) => a.code === addCode);
    if (existing) {
      setAdditions(additions.map((a) => (a.code === addCode ? { ...a, qty: a.qty + qty } : a)));
    } else {
      setAdditions([...additions, { id: crypto.randomUUID(), code: addCode, qty }]);
    }
    setAddQty('');
  }

  function updateAdditionQty(id, rawValue) {
    const qty = rawValue === '' ? 0 : Number(rawValue);
    setAdditions(additions.map((a) => (a.id === id ? { ...a, qty } : a)));
  }

  function removeAddition(id) {
    setAdditions(additions.filter((a) => a.id !== id));
  }

  async function handleConfirm() {
    setConfirming(true);
    await onConfirm(
      {
        orderItemId: orderItem.id,
        type: orderItem.type,
        qtyLabel: orderItem.qtyLabel,
        recipeKey: orderItem.recipeKey,
        lineItems: result.lineItems,
        totalWeightG: result.totalWeightG,
        ingredientsSubtotal: result.ingredientsSubtotal,
        makingCharge: result.makingCharge,
        total: result.total,
      },
      { overrides, additions, makingChargeOverride, spice }
    );
    setConfirming(false);
  }

  const additionCodes = new Set(additions.map((a) => a.code));
  const baseLines = result.lineItems.filter((l) => !additionCodes.has(l.code));

  // Render added chilies right after the core chili rows (GTDC/ABDC/AKDC), matching
  // where the pricing engine places them in the confirmed bill / shared image.
  const lastCoreChiliIdx = baseLines.reduce(
    (idx, line, i) => (coreChiliCodes.includes(line.code) ? i : idx),
    -1
  );
  const linesBeforeAdditions = baseLines.slice(0, lastCoreChiliIdx + 1);
  const linesAfterAdditions = baseLines.slice(lastCoreChiliIdx + 1);

  const masala = masalaTypeLabel(t, orderItem.type, pricingConfig?.masala_types, lang);

  return (
    <>
      <PageHeader
        title={`${masala} · ${orderItem.qtyLabel} kg`}
        description={
          itemCount > 1 ? `${t('billTitle')} ${itemNumber} ${t('of')} ${itemCount}` : t('billTitle')
        }
        actions={<BackButton onClick={onBack} />}
      />

      {detailsParts(details, t).length > 0 && (
        <div className="px-4 pt-6 lg:px-8">
          <div className="flex items-start gap-3 rounded-xl bg-brand-primary px-4 py-3 ring-1 ring-brand ring-inset">
            <MessageTextSquare01 className="mt-0.5 size-5 shrink-0 text-fg-brand-primary" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold text-primary">{t('detailsReminderTitle')}</p>
              <p className="text-sm text-secondary">{detailsParts(details, t).join(' · ')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 px-4 pt-8 lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
          <div className="flex flex-col gap-1 px-4 py-4 lg:px-6">
            <h2 className="text-lg font-semibold text-primary">{t('particulars')}</h2>
            <p className="text-sm text-tertiary">{t('billEditHint')}</p>
          </div>
          <div className="flex flex-col gap-2.5 border-t border-secondary px-4 py-4 lg:px-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-sm font-semibold text-secondary">{t('spiceLevelLabel')}</span>
              <span className="text-xs text-tertiary">
                {t('spiceControlHint')} {coreChiliCodes.join(', ')}
              </span>
            </div>
            <div role="group" aria-label={t('spiceLevelLabel')} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SPICE_LEVELS.map((level, i) => {
                const active = spice === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => chooseSpice(level.id)}
                    className={cx(
                      'flex items-center justify-center gap-2 rounded-xl px-3 py-3 ring-inset transition duration-100 ease-linear',
                      active ? 'bg-brand-solid text-white shadow-md' : 'bg-primary text-primary ring-1 ring-secondary hover:bg-secondary'
                    )}
                  >
                    <span aria-hidden="true" className="flex gap-0.5">
                      {Array.from({ length: i + 1 }).map((_, n) => (
                        <span key={n} className={cx('size-1.5 rounded-full', active ? 'bg-white' : 'bg-brand-solid')} />
                      ))}
                    </span>
                    <span className="text-sm font-bold">{t(level.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <thead className="bg-secondary">
                <tr>
                  <th className={th}>{t('particulars')}</th>
                  <th className={th}>{t('quantity')}</th>
                </tr>
              </thead>
              <tbody>
                {linesBeforeAdditions.map((line) => (
                  <BaseLineRow key={line.code} line={line} overrides={overrides} onChangeQty={updateOverride} />
                ))}

                {additions.map((addition) => (
                  <tr key={addition.id} className="border-t border-secondary bg-brand-primary">
                    <td className={td}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary">{addition.code}</span>
                        <Badge size="sm" type="color" color="brand">
                          {t('addedSuffix')}
                        </Badge>
                      </div>
                    </td>
                    <td className={td}>
                      <div className="flex items-center justify-between gap-2">
                        <QtyInput
                          label={addition.code}
                          value={addition.qty}
                          unit="g"
                          onChange={(v) => updateAdditionQty(addition.id, v)}
                        />
                        <ButtonUtility
                          size="xs"
                          color="tertiary"
                          tooltip={t('remove')}
                          icon={XClose}
                          onClick={() => removeAddition(addition.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}

                {linesAfterAdditions.map((line) => (
                  <BaseLineRow key={line.code} line={line} overrides={overrides} onChangeQty={updateOverride} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-secondary bg-secondary px-4 py-4 sm:flex-row sm:items-end lg:px-6">
            <Select
              label={t('addChiliIngredient')}
              items={addonCodes.map((code) => ({ id: code, label: code }))}
              selectedKey={addCode || null}
              onSelectionChange={(key) => key && setAddCode(String(key))}
              size="sm"
              className="sm:w-44"
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
            <Input
              label={t('quantity')}
              type="number"
              inputMode="decimal"
              size="sm"
              placeholder={t('qtyGramsPlaceholder')}
              value={addQty}
              onChange={setAddQty}
              className="sm:w-36"
            />
            <Button color="secondary" size="sm" iconLeading={Plus} onClick={handleAddIngredient}>
              {t('addItem').replace(/^\+\s*/, '')}
            </Button>
          </div>
        </section>

        <aside className="flex flex-col rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset xl:sticky xl:top-6">
          <div className="flex flex-col gap-3 px-5 py-5 text-sm">
            <div className="flex justify-between">
              <span className="text-tertiary">{t('ingredientsSubtotal')}</span>
              <span className="font-medium text-primary tabular-nums">{inr(result.ingredientsSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-tertiary">{t('makingCharge')}</span>
              <Input
                aria-label={t('makingCharge')}
                type="number"
                inputMode="decimal"
                size="sm"
                value={String(result.makingCharge)}
                onChange={(v) => setMakingChargeOverride(v === '' ? 0 : Number(v))}
                className="w-28"
              />
            </div>
          </div>
          <div className="flex items-baseline justify-between border-t border-secondary bg-secondary px-5 py-4">
            <span className="text-sm font-semibold text-primary">{t('total')}</span>
            <span className="text-display-xs font-semibold text-primary tabular-nums">{inr(result.total)}</span>
          </div>
          <div className="border-t border-secondary px-5 py-4">
            <Button size="lg" iconTrailing={ArrowRight} isLoading={confirming} onClick={handleConfirm} className="w-full">
              {isLast ? t('showFinalBill') : t('nextMasala')}
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
