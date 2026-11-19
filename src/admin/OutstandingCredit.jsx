import { useEffect, useState } from 'react';
import { CurrencyRupeeCircle } from '@untitledui/icons';
import { fetchAllBalances } from '../creditLedger.js';
import { useLanguage } from '../i18n.jsx';

// Cross-shop khata summary for the owner's Analytics overview -- same
// "render nothing unless there's something to say" rule as LowStockAlerts.
export default function OutstandingCredit() {
  const { t } = useLanguage();
  const [balances, setBalances] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAllBalances().then((rows) => {
      if (!cancelled) setBalances(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const owed = (balances || []).filter((b) => b.balance > 0);
  if (!balances || owed.length === 0) return null;

  const total = owed.reduce((sum, b) => sum + b.balance, 0);
  const inr = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-error-secondary text-fg-error-primary">
            <CurrencyRupeeCircle className="size-4.5" />
          </span>
          <div>
            <p className="text-md font-bold text-primary">{t('outstandingCreditTitle')}</p>
            <p className="text-sm text-tertiary">{t('outstandingCreditHint')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-tertiary">{t('totalOutstandingLabel')}</p>
          <p className="text-lg font-bold text-fg-error-primary tabular-nums">{inr(total)}</p>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-secondary">
        {owed.slice(0, 10).map((b) => (
          <li key={b.phone} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-sm font-semibold text-primary">{b.name}</p>
              <p className="truncate text-sm text-tertiary">{b.phone}</p>
            </div>
            <span className="shrink-0 text-sm font-bold text-fg-error-primary tabular-nums">{inr(b.balance)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
