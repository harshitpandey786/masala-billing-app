import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Repeat04 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { useLanguage, masalaTypeLabel, channelLabel } from '../i18n.jsx';
import { masalaTypeColorFor } from '../utils/masalaTypeColor.js';
import { groupBillsIntoOrders } from '../reorder.js';

const th = 'border-b border-secondary bg-secondary px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-tertiary md:px-6';
const td = 'border-b border-secondary px-4 py-3 align-middle text-sm text-tertiary md:px-6';

const unitAbbrev = (unit) => (unit === 'piece' ? 'pcs' : unit === 'kg' ? 'kg' : 'g');
const isProductRow = (row) => row.kind === 'product' || !!row.product_id;

// One customer's history, grouped into the visits it came from (a checkout
// writes one `bills` row per item). Custom masala rows expand to their
// ingredient lines. When `onReorder` is given -- the shop's customer page,
// not the owner's dashboard -- each visit gets an "Order again" action.
export default function BillLedgerTable({ rows, onReorder }) {
  const { t, lang } = useLanguage();
  const [expandedId, setExpandedId] = useState(null);
  const orders = useMemo(() => groupBillsIntoOrders(rows), [rows]);

  const dateFormatter = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>{t('tableType')}</th>
            <th className={th}>{t('tableQty')}</th>
            <th className={th}>{t('tableTotal')}</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const first = order.rows[0];
            return (
              <Fragment key={order.key}>
                <tr className="bg-secondary_alt">
                  <td colSpan={4} className="border-b border-secondary px-4 py-3 md:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-tertiary">
                        <span className="font-semibold text-primary">{dateFormatter.format(new Date(order.orderDate))}</span>
                        {' · '}
                        {order.rows.length} {t('itemsLabel')}
                        {' · '}
                        {channelLabel(t, first.billing_mode === 'offline' ? first.store || 'offline-other' : 'online')}
                        {' · '}
                        <span className="font-semibold text-primary tabular-nums">{inr(order.total)}</span>
                      </p>
                      {onReorder && (
                        <Button size="sm" color="secondary" iconLeading={Repeat04} onClick={() => onReorder(order)}>
                          {t('reorderOrder')}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>

                {order.rows.map((row) => {
                  const product = isProductRow(row);
                  const line = row.line_items?.[0];
                  const isOpen = expandedId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr className="hover:bg-secondary">
                        <td className={td}>
                          {product ? (
                            <span className="font-medium text-primary">{line?.code || '—'}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`size-1.5 shrink-0 rounded-full ${masalaTypeColorFor(row.masala_type).dot}`} />
                              <span className="font-medium text-primary">
                                {masalaTypeLabel(t, (row.masala_type || '').toLowerCase())}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          {product ? `${line?.qty ?? 1} ${unitAbbrev(line?.unit)}` : `${row.quantity_kg} kg`}
                        </td>
                        <td className={`${td} font-medium whitespace-nowrap text-primary tabular-nums`}>{inr(row.total)}</td>
                        <td className={`${td} text-right`}>
                          {!product && (
                            <Button
                              size="sm"
                              color="link-gray"
                              iconTrailing={isOpen ? ChevronDown : ChevronRight}
                              onClick={() => setExpandedId(isOpen ? null : row.id)}
                            >
                              {isOpen ? t('hideDetails') : t('viewDetails')}
                            </Button>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={4} className="border-b border-secondary bg-secondary px-4 py-4 md:px-6">
                            <div className="overflow-hidden rounded-lg bg-primary ring-1 ring-secondary ring-inset">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr>
                                    <th className="border-b border-secondary px-4 py-2.5 text-left text-xs font-semibold text-tertiary">
                                      {t('particulars')}
                                    </th>
                                    <th className="border-b border-secondary px-4 py-2.5 text-left text-xs font-semibold text-tertiary">
                                      {t('quantity')}
                                    </th>
                                    <th className="border-b border-secondary px-4 py-2.5 text-right text-xs font-semibold text-tertiary">
                                      {t('amount')}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(row.line_items || []).map((l, i) => (
                                    <tr key={`${row.id}-${l.code}-${i}`}>
                                      <td className="border-b border-secondary px-4 py-2 text-primary">{l.code}</td>
                                      <td className="border-b border-secondary px-4 py-2 text-tertiary">
                                        {l.qty} {l.unit === 'piece' ? 'pcs' : 'g'}
                                      </td>
                                      <td className="border-b border-secondary px-4 py-2 text-right text-tertiary tabular-nums">
                                        ₹{l.amount}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr>
                                    <td colSpan={2} className="border-b border-secondary px-4 py-2 font-medium text-secondary">
                                      {t('ingredientsSubtotal')}
                                    </td>
                                    <td className="border-b border-secondary px-4 py-2 text-right font-medium text-secondary tabular-nums">
                                      ₹{row.ingredients_subtotal}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colSpan={2} className="px-4 py-2 font-medium text-secondary">
                                      {t('makingCharge')}
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium text-secondary tabular-nums">
                                      ₹{row.making_charge}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
