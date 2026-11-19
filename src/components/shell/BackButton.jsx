import { ArrowLeft } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { useLanguage } from '../../i18n.jsx';

// A plain `color="secondary"` button (white background, thin grey ring)
// reads as almost invisible against this app's bold red/white pages -- the
// client flagged step navigation specifically, since missing it means not
// being able to go back and fix an order. Same shape/behavior as secondary,
// just tinted with the brand color so it reads as a clear, tappable control
// instead of blending into the page. Used on every step of the billing flow
// (OrderTypeChoice, OrderBuilder, MasalaDetails, BillGenerator, FinalBill,
// CustomerDetails) so the fix only needs to happen in one place.
export default function BackButton({ onClick, label }) {
  const { t } = useLanguage();
  if (!onClick) return null;
  return (
    <Button
      color="secondary"
      size="md"
      iconLeading={ArrowLeft}
      onClick={onClick}
      className="ring-brand text-fg-brand-primary hover:bg-brand-primary hover:text-fg-brand-primary *:data-icon:text-fg-brand-primary hover:*:data-icon:text-fg-brand-primary"
    >
      {label || t('back')}
    </Button>
  );
}
