import { useMemo, useState } from 'react';
import { Check, Plus, XClose } from '@untitledui/icons';
import { Badge } from '@/components/base/badges/badges';
import { Button } from '@/components/base/buttons/button';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { Input } from '@/components/base/input/input';
import { Select } from '@/components/base/select/select';
import { priceRecipe } from '../pricing-engine.js';
import { getAddonIngredientCodes, getCoreChiliRowCodes } from '../recipeCatalog.js';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';

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
      <td className={`${td} text-right font-medium text-primary tabular-nums`}>{inr(line.amount)}</td>
    </tr>
  );
}

export default function BillGenerator({ orderItem, itemNumber, itemCount, onConfirm, pricingConfig }) {
  const { t, lang } = useLanguage();
  const addonCodes = useMemo(() => getAddonIngredientCodes(pricingConfig), [pricingConfig]);
  const coreChiliCodes = useMemo(() => getCoreChiliRowCodes(pricingConfig), [pricingConfig]);
  const [overrides, setOverrides] = useState({});
  const [additions, setAdditions] = useState([]);
  const [addCode, setAddCode] = useState(addonCodes[0] || '');
  const [addQty, setAddQty] = useState('');
  const [makingChargeOverride, setMakingChargeOverride] = useState(null);
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
    await onConfirm({
      orderItemId: orderItem.id,
      type: orderItem.type,
      qtyLabel: orderItem.qtyLabel,
      recipeKey: orderItem.recipeKey,
      lineItems: result.lineItems,
      totalWeightG: result.totalWeightG,
      ingredientsSubtotal: result.ingredientsSubtotal,
      makingCharge: result.makingCharge,
      total: result.total,
    });
    // No reset on success -- the last bill's confirm navigates away (to
    // Share) and earlier bills remount a fresh BillGenerator for the next
    // item, so this component is gone either way once onConfirm resolves.
  }

  const additionCodes = new Set(additions.map((a) => a.code));
  const baseLines = result.lineItems.filter((l) => !additionCodes.has(l.code));
  const addedLines = result.lineItems.filter((l) => additionCodes.has(l.code));

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
      />

      <div className="grid grid-cols-1 items-start gap-6 px-4 pt-8 lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
          <div className="flex flex-col gap-1 px-4 py-4 lg:px-6">
            <h2 className="text-lg font-semibold text-primary">{t('particulars')}</h2>
            <p className="text-sm text-tertiary">{t('billEditHint')}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <thead className="bg-secondary">
                <tr>
                  <th className={th}>{t('particulars')}</th>
                  <th className={th}>{t('quantity')}</th>
                  <th className={`${th} text-right`}>{t('amount')}</th>
                </tr>
              </thead>
              <tbody>
                {linesBeforeAdditions.map((line) => (
                  <BaseLineRow key={line.code} line={line} overrides={overrides} onChangeQty={updateOverride} />
                ))}

                {additions.map((addition) => {
                  const line = addedLines.find((l) => l.code === addition.code);
                  return (
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
                        <QtyInput
                          label={addition.code}
                          value={addition.qty}
                          unit="g"
                          onChange={(v) => updateAdditionQty(addition.id, v)}
                        />
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium text-primary tabular-nums">{inr(line ? line.amount : 0)}</span>
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
                  );
                })}

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
            <Button size="lg" iconLeading={Check} isLoading={confirming} onClick={handleConfirm} className="w-full">
              {confirming ? t('savingBill') : t('confirmBill')}
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
