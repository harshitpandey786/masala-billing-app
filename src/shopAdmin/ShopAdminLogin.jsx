import { useState } from 'react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

// A second, shop-specific password -- separate from the billing login this
// shop already used to get into the app (locationSession.js). Checked fresh
// against `locations.admin_password` for the already-known logged-in shop's
// id, so there is no username/shop picker here: this can only ever unlock
// *this* shop's own pricing, never another shop's, even if someone guesses
// another shop's admin password.
export default function ShopAdminLogin({ location, onUnlock }) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | error | not_set

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
        .select('admin_password')
        .eq('id', location.id)
        .maybeSingle();
      if (error || !data) {
        setStatus('error');
        return;
      }
      if (!data.admin_password) {
        setStatus('not_set');
        return;
      }
      if (data.admin_password !== value) {
        setStatus('error');
        return;
      }
      onUnlock();
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="w-full max-w-md rounded-xl bg-primary p-6 shadow-xs ring-1 ring-secondary ring-inset">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-primary">{t('shopAdminTitle')}</h2>
        <p className="text-sm text-tertiary">{location.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
        <p className="text-sm text-tertiary">{t('shopAdminLoginHint')}</p>
        <Input
          label={t('password')}
          type="password"
          value={value}
          onChange={setValue}
          autoFocus
          isInvalid={status === 'error' || status === 'not_set'}
          hint={
            status === 'error' ? t('wrongPassword') : status === 'not_set' ? t('shopAdminPasswordNotSet') : undefined
          }
        />

        <Button type="submit" size="md" isLoading={status === 'checking'} className="w-full">
          {status === 'checking' ? t('savingBill') : t('unlock')}
        </Button>
      </form>
    </section>
  );
}
