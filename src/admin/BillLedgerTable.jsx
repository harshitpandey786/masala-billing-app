import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { useLanguage, masalaTypeLabel, channelLabel } from '../i18n.jsx';

const th = 'border-b border-secondary bg-secondary px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-tertiary md:px-6';
const td = 'border-b border-secondary px-4 py-4 align-middle text-sm text-tertiary md:px-6';

// One customer's bills, each expandable to its ingredient line items. Used
// inside the customer detail view -- no customer/phone column needed there,
// since the whole table is already scoped to one customer.
export default function BillLedgerTable({ rows }) {
  const { t, lang } = useLanguage();
  const [expandedId, setExpandedId] = useState(null);

  const dateFormatter = new Intl.DateTimeFormat(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className={th}>{t('tableDate')}</th>
            <th className={th}>{t('tableType')}</th>
            <th className={th}>{t('tableQty')}</th>
            <th className={th}>{t('tableTotal')}</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = expandedId === row.id;
            return (
              <Fragment key={row.id}>
                <tr className="hover:bg-secondary">
                  <td className={`${td} whitespace-nowrap`}>{dateFormatter.format(new Date(row.order_date))}</td>
                  <td className={td}>
                    <span className="font-medium text-primary">
                      {masalaTypeLabel(t, (row.masala_type || '').toLowerCase())}
                    </span>
                    {' · '}
                    {channelLabel(t, row.billing_mode === 'offline' ? row.store || 'offline-other' : 'online')}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{row.quantity_kg} kg</td>
                  <td className={`${td} font-medium whitespace-nowrap text-primary tabular-nums`}>
                    ₹{Number(row.total).toLocaleString('en-IN')}
                  </td>
                  <td className={`${td} text-right`}>
                    <Button
                      size="sm"
                      color="link-gray"
                      iconTrailing={isOpen ? ChevronDown : ChevronRight}
                      onClick={() => setExpandedId(isOpen ? null : row.id)}
                    >
                      {isOpen ? t('hideDetails') : t('viewDetails')}
                    </Button>
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={5} className="border-b border-secondary bg-secondary px-4 py-4 md:px-6">
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
                            {(row.line_items || []).map((line, i) => (
                              <tr key={`${row.id}-${line.code}-${i}`}>
                                <td className="border-b border-secondary px-4 py-2 text-primary">{line.code}</td>
                                <td className="border-b border-secondary px-4 py-2 text-tertiary">
                                  {line.qty} {line.unit === 'piece' ? 'pcs' : 'g'}
                                </td>
                                <td className="border-b border-secondary px-4 py-2 text-right text-tertiary tabular-nums">
                                  ₹{line.amount}
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
        </tbody>
      </table>
    </div>
  );
}
