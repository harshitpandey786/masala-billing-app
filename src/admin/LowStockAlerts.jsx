import { useEffect, useState } from 'react';
import { AlertTriangle } from '@untitledui/icons';
import { fetchLowStock } from '../lowStock.js';
import { useLanguage } from '../i18n.jsx';

// Cross-shop low-stock panel for the owner's Analytics overview -- renders
// nothing while loading or once resolved empty, same "quiet unless there's
// something to say" rule as App.jsx's TodayStats, so it never adds an empty
// box to a dashboard that has nothing to flag.
export default function LowStockAlerts() {
  const { t } = useLanguage();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchLowStock({}).then((rows) => {
      if (!cancelled) setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset lg:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning-secondary text-fg-warning-primary">
          <AlertTriangle className="size-4.5" />
        </span>
        <div>
          <p className="text-md font-bold text-primary">{t('lowStockAlertsTitle')}</p>
          <p className="text-sm text-tertiary">{t('lowStockOwnerHint')}</p>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-secondary">
        {items.map((item) => (
          <li key={`${item.productId}:${item.locationId}`} className="flex items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-sm font-semibold text-primary">{item.name}</p>
              <p className="truncate text-sm text-tertiary">{item.locationName}</p>
            </div>
            <span
              className={
                item.qtyOnHand === 0
                  ? 'shrink-0 text-sm font-bold text-fg-error-primary tabular-nums'
                  : 'shrink-0 text-sm font-bold text-fg-warning-primary tabular-nums'
              }
            >
              {item.qtyOnHand === 0 ? t('outOfStockShort') : `${item.qtyOnHand} ${t('left')}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
