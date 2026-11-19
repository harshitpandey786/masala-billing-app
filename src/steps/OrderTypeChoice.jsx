import { ArrowRight, Scales02, ShoppingBag01 } from '@untitledui/icons';
import { useLanguage } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';
import BackButton from '../components/shell/BackButton.jsx';

// First thing after "Generate New Bill": start with custom masala or with
// ready-made products. Either way the next screen can add the other kind
// into the same bill.
export default function OrderTypeChoice({ onChoose, onBack }) {
  const { t } = useLanguage();

  return (
    <>
      <PageHeader
        title={t('chooseTitle')}
        description={t('chooseHint')}
        actions={<BackButton onClick={onBack} />}
      />

      <div className="grid grid-cols-1 gap-5 px-4 pt-8 md:grid-cols-2 lg:px-8">
        <button
          type="button"
          onClick={() => onChoose('custom')}
          className="group relative flex min-h-56 flex-col justify-between gap-8 overflow-hidden rounded-2xl bg-brand-solid p-7 text-left text-white shadow-md transition duration-150 ease-linear hover:bg-brand-solid_hover"
        >
          <span className="flex size-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Scales02 className="size-8" />
          </span>
          <span className="flex items-end justify-between gap-4">
            <span className="flex flex-col gap-1.5">
              <span className="text-display-xs font-bold">{t('customMasalaTitle')}</span>
              <span className="max-w-xs text-md text-white/80">{t('customOptionHint')}</span>
            </span>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-fg-brand-primary transition-transform duration-150 ease-linear group-hover:translate-x-1">
              <ArrowRight className="size-5" />
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChoose('readymade')}
          className="group relative flex min-h-56 flex-col justify-between gap-8 overflow-hidden rounded-2xl bg-primary p-7 text-left shadow-md ring-1 ring-secondary ring-inset transition duration-150 ease-linear hover:bg-secondary"
        >
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-2/5 bg-cover bg-center opacity-90 [mask-image:linear-gradient(to_left,black_40%,transparent)]"
            style={{ backgroundImage: "url('/products/5745.jpg')" }}
          />
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-brand-primary text-fg-brand-primary ring-1 ring-brand ring-inset">
            <ShoppingBag01 className="size-8" />
          </span>
          <span className="relative flex items-end justify-between gap-4">
            <span className="flex max-w-[60%] flex-col gap-1.5">
              <span className="text-display-xs font-bold text-primary">{t('readyMadeOptionTitle')}</span>
              <span className="text-md text-tertiary">{t('readyMadeOptionHint')}</span>
            </span>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-solid text-white transition-transform duration-150 ease-linear group-hover:translate-x-1">
              <ArrowRight className="size-5" />
            </span>
          </span>
        </button>
      </div>
    </>
  );
}
