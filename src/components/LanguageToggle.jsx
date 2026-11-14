import { ButtonGroup, ButtonGroupItem } from '@/components/base/button-group/button-group';
import { useLanguage } from '../i18n.jsx';

// The base ButtonGroup's selected state is a quiet grey (shared with the
// masala-type / billing-mode toggles, where that's the right call) -- the
// language switch is the one exception, since it's the first thing on the
// login screens and should read as a clear, branded on/off rather than
// blend into the page.
const SELECTED_BRAND = [
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
      <ButtonGroupItem id="mr" className={SELECTED_BRAND}>
        मराठी
      </ButtonGroupItem>
      <ButtonGroupItem id="en" className={SELECTED_BRAND}>
        English
      </ButtonGroupItem>
    </ButtonGroup>
  );
}
