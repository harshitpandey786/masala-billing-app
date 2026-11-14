import { useState } from 'react';
import { AlertCircle } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { supabase } from '../supabaseClient.js';
import { storeLocation } from '../locationSession.js';
import { useLanguage } from '../i18n.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';

// Gates the billing flow behind a per-shop login, modeled on AdminLogin.jsx.
// Same security tradeoff as that password: this checks the locations table
// with the anon key from the browser, which gates the UI, not the database.
// On success, the shop's id/name is stored (see locationSession.js) so every
// bill made on this device is tagged automatically -- no per-bill picker.
export default function LocationLogin({ onLoggedIn }) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) {
      setStatus('error');
      return;
    }
    setStatus('checking');
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('login_username', username.trim())
        .eq('login_password', password)
        .maybeSingle();
      if (error || !data) {
        setStatus('error');
        return;
      }
      storeLocation(data);
      onLoggedIn(data);
    } catch {
      setStatus('error');
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
            <img src="/logo-mark.png" alt="Shindraj Masale logo" className="size-14 object-contain" />
            <div className="flex flex-col gap-2">
              <h1 className="text-display-xs font-semibold text-primary">{t('locationLoginTitle')}</h1>
              <p className="text-md text-tertiary">{t('locationLoginHint')}</p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 rounded-xl bg-primary p-6 shadow-sm ring-1 ring-secondary ring-inset"
          >
            {!supabase && (
              <p className="flex items-center gap-2 text-sm text-error-primary">
                <AlertCircle className="size-4 shrink-0" />
                {t('notConfigured')}
              </p>
            )}
            <Input
              label={t('shopUsername')}
              value={username}
              onChange={setUsername}
              autoFocus
              autoComplete="username"
            />
            <Input
              label={t('password')}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              isInvalid={status === 'error'}
              hint={status === 'error' ? t('wrongPassword') : undefined}
            />
            <Button type="submit" size="lg" isLoading={status === 'checking'} className="w-full">
              {t('unlock')}
            </Button>
          </form>

          <p className="text-center text-sm text-tertiary">{t('tagline')}</p>
        </div>
      </div>
    </div>
  );
}
