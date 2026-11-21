import { useState } from 'react';
import { ArrowRight } from '@untitledui/icons';
import { TextArea } from '@/components/base/textarea/textarea';
import { emptyDetails } from '../masalaDetails.js';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';
import BackButton from '../components/shell/BackButton.jsx';

// Client step 2 for one custom masala: a free note on anything the customer
// asked for (spice level, extra/without an ingredient, packing, etc). Saved
// with the bill and shown to the counter as a reminder on the proforma
// (step 3), where the actual pricing changes -- spice level and ingredient
// adjustments are made directly there, not pre-filled from this note.
export default function MasalaDetails({ orderItem, itemNumber, itemCount, initialDetails, onNext, onBack, pricingConfig }) {
  const { t, lang } = useLanguage();
  const [details, setDetails] = useState(() => initialDetails ?? emptyDetails());

  const masala = masalaTypeLabel(t, orderItem.type, pricingConfig?.masala_types, lang);

  return (
    <>
      <PageHeader
        title={`${masala} · ${orderItem.qtyLabel} kg`}
        description={
          itemCount > 1
            ? `${t('detailsStepHint')} · ${itemNumber} ${t('of')} ${itemCount}`
            : t('detailsStepHint')
        }
        actions={<BackButton onClick={onBack} />}
      />

      <div className="grid grid-cols-1 items-start gap-6 px-4 pt-8 lg:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-4 rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset lg:p-6">
          <TextArea
            label={t('detailsNoteLabel')}
            value={details.note}
            onChange={(note) => setDetails({ ...details, note })}
            placeholder={t('detailsNotePlaceholder')}
            rows={5}
          />
        </section>

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
