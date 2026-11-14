import { useState } from 'react';
import { Lock01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { useLanguage } from '../i18n.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export default function AdminLogin({ onUnlock }) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (ADMIN_PASSWORD && value === ADMIN_PASSWORD) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <div className="flex justify-end p-4">
        <LanguageToggle />
      </div>
      <div className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-16">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col items-center gap-5 text-center">
            <img
              src="/logo-mark.png"
              alt="Shindraj Masale logo"
              className="size-14 object-contain"
            />
            <div className="flex flex-col gap-2">
              <h1 className="text-display-xs font-semibold text-primary">{t('ownerLoginTitle')}</h1>
              <p className="text-md text-tertiary">{t('enterPassword')}</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 rounded-xl bg-primary p-6 shadow-sm ring-1 ring-secondary ring-inset"
          >
            {!ADMIN_PASSWORD && (
              <p className="text-sm text-error-primary">
                VITE_ADMIN_PASSWORD is not set — see docs/supabase-setup.md to configure the owner
                password before this page will unlock.
              </p>
            )}
            <Input
              type="password"
              label={t('password')}
              icon={Lock01}
              value={value}
              onChange={setValue}
              isInvalid={error}
              hint={error ? t('wrongPassword') : undefined}
              autoFocus
            />
            <Button type="submit" size="lg" className="w-full">
              {t('unlock')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
