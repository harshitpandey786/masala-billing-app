import { useState } from 'react';
import { Lock01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { FeaturedIcon } from '@/components/foundations/featured-icon/featured-icon';
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
    <section className="w-full max-w-md rounded-2xl bg-primary p-7 shadow-lg ring-1 ring-secondary ring-inset">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 pb-1 text-center">
          <FeaturedIcon icon={Lock01} color="brand" theme="light" size="lg" />
          <p className="text-sm text-tertiary">{t('shopAdminLoginHint')}</p>
        </div>
        <Input
          label={t('password')}
          type="password"
          value={value}
          onChange={setValue}
          autoFocus
          autoComplete="current-password"
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
