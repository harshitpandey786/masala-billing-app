import { useRef, useState } from 'react';
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
  const passwordRef = useRef(null);

  // A wrong attempt left the old (wrong) value sitting in the field --
  // retyping on top of it, rather than a clean field, is what the client
  // reported as "can't enter it correctly again". Clear and refocus so the
  // next attempt starts clean.
  function failWith(status) {
    setStatus(status);
    setPassword('');
    passwordRef.current?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!supabase) {
      setStatus('error');
      return;
    }
    setStatus('checking');
    try {
      const query = (columns) =>
        supabase
          .from('locations')
          .select(columns.join(', '))
          .eq('login_username', username.trim())
          .eq('login_password', password)
          .maybeSingle();
      // `gstin` (§12c) / `upi_vpa` (§14) / `is_online` (§15) might not be
      // added yet -- fall back column by column rather than blocking login
      // over a bill feature that hasn't been set up yet.
      let columns = ['id', 'name', 'gstin', 'upi_vpa', 'is_online'];
      let { data, error } = await query(columns);
      for (const optional of ['gstin', 'upi_vpa', 'is_online']) {
        if (error && new RegExp(optional).test(error.message || '') && columns.includes(optional)) {
          columns = columns.filter((c) => c !== optional);
          ({ data, error } = await query(columns));
        }
      }
      if (error || !data) {
        failWith('error');
        return;
      }
      storeLocation(data);
      onLoggedIn(data);
    } catch {
      failWith('error');
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
              ref={passwordRef}
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
