import { useState } from 'react';
import { Lock01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { useLanguage } from '../i18n.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import AuthBackdrop from '../components/AuthBackdrop.jsx';

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
    <AuthBackdrop>
      <div className="flex justify-end p-4">
        <div className="rounded-lg bg-primary/90 p-1 shadow-sm backdrop-blur-sm">
          <LanguageToggle />
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="flex w-full max-w-sm flex-col gap-5">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 rounded-2xl bg-primary p-7 shadow-xl ring-1 ring-secondary ring-inset"
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <img src="/logo-mark.png" alt="Shindraj Masale logo" className="size-14 rounded-xl object-contain" />
              <div className="flex flex-col gap-1">
                <h1 className="text-display-xs font-bold text-primary">{t('ownerLoginTitle')}</h1>
                <p className="text-sm text-tertiary">{t('enterPassword')}</p>
              </div>
            </div>

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
              autoComplete="current-password"
            />
            <Button type="submit" size="lg" className="w-full">
              {t('unlock')}
            </Button>
          </form>

          <p className="text-center text-sm font-medium text-white drop-shadow-sm">{t('tagline')}</p>
        </div>
      </div>
    </AuthBackdrop>
  );
}
