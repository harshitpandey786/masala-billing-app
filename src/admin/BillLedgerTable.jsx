import { Fragment, useState } from 'react';
import { useLanguage, masalaTypeLabel, channelLabel } from '../i18n.jsx';

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
    <div className="table-scroll">
      <table className="bill-table ledger-table">
        <thead>
          <tr>
            <th>{t('tableDate')}</th>
            <th>{t('tableType')}</th>
            <th>{t('tableQty')}</th>
            <th>{t('tableTotal')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = expandedId === row.id;
            return (
              <Fragment key={row.id}>
                <tr className="ledger-row">
                  <td>{dateFormatter.format(new Date(row.order_date))}</td>
                  <td>
                    {masalaTypeLabel(t, (row.masala_type || '').toLowerCase())}
                    {' · '}
                    {channelLabel(t, row.billing_mode === 'offline' ? row.store || 'offline-other' : 'online')}
                  </td>
                  <td>{row.quantity_kg} kg</td>
                  <td>₹{Number(row.total).toLocaleString('en-IN')}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={() => setExpandedId(isOpen ? null : row.id)}
                    >
                      {isOpen ? t('hideDetails') : t('viewDetails')}
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="ledger-detail-row">
                    <td colSpan={5}>
                      <table className="bill-table ledger-detail-table">
                        <thead>
                          <tr>
                            <th>{t('particulars')}</th>
                            <th>{t('quantity')}</th>
                            <th>{t('amount')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(row.line_items || []).map((line, i) => (
                            <tr key={`${row.id}-${line.code}-${i}`}>
                              <td>{line.code}</td>
                              <td>
                                {line.qty} {line.unit === 'piece' ? 'pcs' : 'g'}
                              </td>
                              <td>₹{line.amount}</td>
                            </tr>
                          ))}
                          <tr className="subtotal-row">
                            <td colSpan={2}>{t('ingredientsSubtotal')}</td>
                            <td>₹{row.ingredients_subtotal}</td>
                          </tr>
                          <tr className="making-charge-row">
                            <td colSpan={2}>{t('makingCharge')}</td>
                            <td>₹{row.making_charge}</td>
                          </tr>
                        </tbody>
                      </table>
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
