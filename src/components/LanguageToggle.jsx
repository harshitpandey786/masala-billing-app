import { ButtonGroup, ButtonGroupItem } from '@/components/base/button-group/button-group';
import { useLanguage } from '../i18n.jsx';

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
      <ButtonGroupItem id="mr">मराठी</ButtonGroupItem>
      <ButtonGroupItem id="en">English</ButtonGroupItem>
    </ButtonGroup>
  );
}
