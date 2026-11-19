import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { TextArea } from '@/components/base/textarea/textarea';
import { cx } from '@/utils/cx';
import { priceRecipe } from '../pricing-engine.js';
import { getAddonIngredientCodes } from '../recipeCatalog.js';
import { SPICE_LEVELS, emptyDetails } from '../masalaDetails.js';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';

function recipeCodes(recipeKey, config) {
  try {
    return priceRecipe(recipeKey, { config }).lineItems.map((l) => l.code);
  } catch {
    return [];
  }
}

function IngredientChips({ codes, selected, onToggle, nameFor }) {
  return (
    <div className="flex flex-wrap gap-2">
      {codes.map((code) => {
        const active = selected.includes(code);
        const name = nameFor(code);
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(code)}
            className={cx(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ring-inset transition duration-100 ease-linear',
              active ? 'bg-brand-solid text-white shadow-sm' : 'bg-primary text-secondary ring-1 ring-secondary hover:bg-secondary'
            )}
          >
            {active && <Check className="size-3.5 shrink-0" />}
            <span className="font-bold">{code}</span>
            {name && <span className={active ? 'text-white/80' : 'text-tertiary'}>{name}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Client step 2 for one custom masala: how spicy, what they want extra, what
// they don't want, plus a free note. Saved with the bill; the counter then
// makes the matching changes on the proforma (step 3).
export default function MasalaDetails({ orderItem, itemNumber, itemCount, initialDetails, onNext, onBack, pricingConfig }) {
  const { t, lang } = useLanguage();
  const [details, setDetails] = useState(() => initialDetails ?? emptyDetails());

  const baseCodes = useMemo(() => recipeCodes(orderItem.recipeKey, pricingConfig), [orderItem.recipeKey, pricingConfig]);
  const extraCodes = useMemo(
    () => [...new Set([...baseCodes, ...getAddonIngredientCodes(pricingConfig)])],
    [baseCodes, pricingConfig]
  );

  function nameFor(code) {
    const rate = pricingConfig?.rate_card?.[code];
    return (lang === 'mr' ? rate?.name_mr || rate?.name_en : rate?.name_en) || '';
  }

  function toggle(field, code) {
    const list = details[field];
    const next = list.includes(code) ? list.filter((c) => c !== code) : [...list, code];
    // An ingredient can't be both wanted extra and not wanted.
    const other = field === 'extra' ? 'without' : 'extra';
    setDetails({ ...details, [field]: next, [other]: details[other].filter((c) => c !== code) });
  }

  const masala = masalaTypeLabel(t, orderItem.type, pricingConfig?.masala_types, lang);
  const card = 'flex flex-col gap-4 rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset lg:p-6';

  return (
    <>
      <PageHeader
        title={`${masala} · ${orderItem.qtyLabel} kg`}
        description={
          itemCount > 1
            ? `${t('detailsStepHint')} · ${itemNumber} ${t('of')} ${itemCount}`
            : t('detailsStepHint')
        }
        actions={
          <Button color="secondary" size="md" iconLeading={ArrowLeft} onClick={onBack}>
            {t('back')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 px-4 pt-8 lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className={card}>
            <h2 className="text-xl font-bold text-primary">{t('spiceLevelLabel')}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SPICE_LEVELS.map((level, i) => {
                const active = details.spice === level.id;
                return (
                  <button
                    key={level.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDetails({ ...details, spice: active ? null : level.id })}
                    className={cx(
                      'flex flex-col items-center gap-1.5 rounded-xl px-3 py-4 ring-inset transition duration-100 ease-linear',
                      active ? 'bg-brand-solid text-white shadow-md' : 'bg-primary text-primary ring-1 ring-secondary hover:bg-secondary'
                    )}
                  >
                    <span aria-hidden="true" className="flex gap-0.5">
                      {Array.from({ length: i + 1 }).map((_, n) => (
                        <span key={n} className={cx('size-2 rounded-full', active ? 'bg-white' : 'bg-brand-solid')} />
                      ))}
                    </span>
                    <span className="text-md font-bold">{t(level.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={card}>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-bold text-primary">{t('extraIngredientsLabel')}</h2>
              <p className="text-sm text-tertiary">{t('extraIngredientsHint')}</p>
            </div>
            <IngredientChips codes={extraCodes} selected={details.extra} onToggle={(c) => toggle('extra', c)} nameFor={nameFor} />
          </section>

          <section className={card}>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-bold text-primary">{t('withoutIngredientsLabel')}</h2>
              <p className="text-sm text-tertiary">{t('withoutIngredientsHint')}</p>
            </div>
            <IngredientChips codes={baseCodes} selected={details.without} onToggle={(c) => toggle('without', c)} nameFor={nameFor} />
          </section>

          <section className={card}>
            <TextArea
              label={t('detailsNoteLabel')}
              value={details.note}
              onChange={(note) => setDetails({ ...details, note })}
              placeholder={t('detailsNotePlaceholder')}
              rows={3}
            />
          </section>
        </div>

        <aside className="flex flex-col gap-3 rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset xl:sticky xl:top-6">
          <button
            type="button"
            onClick={() => onNext(details)}
            className="group flex w-full items-center justify-between gap-3 rounded-xl bg-brand-solid px-5 py-4 text-left text-white shadow-md transition duration-150 ease-linear hover:bg-brand-solid_hover"
          >
            <span className="text-lg font-bold">{t('goToProforma')}</span>
            <span className="flex size-9 items-center justify-center rounded-full bg-white text-fg-brand-primary transition-transform duration-150 ease-linear group-hover:translate-x-1">
              <ArrowRight className="size-4" />
            </span>
          </button>
          <p className="text-sm text-tertiary">{t('detailsSkipHint')}</p>
        </aside>
      </div>
    </>
  );
}
