import { useState } from 'react';
import { AlertCircle } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { supabase } from '../supabaseClient.js';
import { storeLocation } from '../locationSession.js';
import { useLanguage } from '../i18n.jsx';
import LanguageToggle from '../components/LanguageToggle.jsx';
import AuthBackdrop from '../components/AuthBackdrop.jsx';

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
                <h1 className="text-display-xs font-bold text-primary">{t('locationLoginTitle')}</h1>
                <p className="text-sm text-tertiary">{t('locationLoginHint')}</p>
              </div>
            </div>

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

          <p className="text-center text-sm font-medium text-white drop-shadow-sm">{t('tagline')}</p>
        </div>
      </div>
    </AuthBackdrop>
  );
}
