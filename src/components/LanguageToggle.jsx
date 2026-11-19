import { ButtonGroup, ButtonGroupItem } from '@/components/base/button-group/button-group';
import { useLanguage } from '../i18n.jsx';

// The base ButtonGroup's selected state defaults to a quiet grey -- too
// quiet for this app's bold-red design language, where the client wants a
// selected option (language, billing mode, payment method, ...) to read as
// clearly, unmistakably chosen. Shared by every ButtonGroup in the app that
// needs that -- see CustomerDetails.jsx's billing mode / payment method.
export const SELECTED_BRAND_BUTTON_GROUP = [
  'selected:bg-brand-solid! selected:text-white! selected:shadow-xs-skeuomorphic!',
  'selected:hover:bg-brand-solid_hover! selected:hover:text-white!',
].join(' ');

export default function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <ButtonGroup
      size="sm"
      aria-label={t('langToggleLabel')}
      selectedKeys={[lang]}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        if (next) setLang(String(next));
      }}
    >
      <ButtonGroupItem id="mr" className={SELECTED_BRAND_BUTTON_GROUP}>
        मराठी
      </ButtonGroupItem>
      <ButtonGroupItem id="en" className={SELECTED_BRAND_BUTTON_GROUP}>
        English
      </ButtonGroupItem>
    </ButtonGroup>
  );
}
