import { useState } from 'react';
import { Lock01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { useLanguage } from '../i18n.jsx';

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
    <div className="flex justify-center px-4 py-16 lg:px-8">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-primary">{t('adminTitle')}</h1>
          <p className="text-sm text-tertiary">{t('enterPassword')}</p>
        </div>

        {!ADMIN_PASSWORD && (
          <p className="text-sm text-error-primary">
            VITE_ADMIN_PASSWORD is not set — see docs/supabase-setup.md to configure the owner
            password before this page will unlock.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
  );
}
