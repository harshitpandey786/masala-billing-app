import { useLanguage } from '../i18n.jsx';

export default function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="lang-toggle" role="group" aria-label={t('langToggleLabel')}>
      <button
        type="button"
        className={lang === 'mr' ? 'active' : ''}
        onClick={() => setLang('mr')}
      >
        मर
      </button>
      <button
        type="button"
        className={lang === 'en' ? 'active' : ''}
        onClick={() => setLang('en')}
      >
        EN
      </button>
    </div>
  );
}
