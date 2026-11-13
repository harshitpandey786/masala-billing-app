import { useEffect, useState } from 'react';
import { searchCustomers } from '../customerSearch.js';
import { useLanguage } from '../i18n.jsx';

const POC_OPTIONS = ['Sachin', 'Bhaskar', 'Sanket', 'Shreyash', 'Suvarna', 'Rampal', 'Sonu'];

export default function CustomerDetails({ customer, onChange, onNext }) {
  const { t } = useLanguage();
  const [touched, setTouched] = useState(false);
  const [matches, setMatches] = useState([]);
  const [matchesOpen, setMatchesOpen] = useState(false);

  const isValid = customer.name.trim() && customer.phone.trim() && customer.area.trim() && customer.pocName;

  function update(field, value) {
    onChange({ ...customer, [field]: value });
  }

  // Looks up returning customers as the phone number is typed, so the
  // shopkeeper doesn't have to re-type name/area for someone who has
  // ordered before -- see customerSearch.js (shared with the admin
  // customer list).
  useEffect(() => {
    if (customer.phone.trim().length < 3) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      const results = await searchCustomers(customer.phone);
      if (!cancelled) {
        setMatches(results);
        setMatchesOpen(results.length > 0);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.phone]);

  function selectMatch(match) {
    onChange({
      ...customer,
      name: match.name || customer.name,
      phone: match.phone,
      area: match.area || customer.area,
      pocName: match.pocName || customer.pocName,
    });
    setMatchesOpen(false);
  }

  function handleNext() {
    setTouched(true);
    if (isValid) onNext();
  }

  return (
    <section className="card">
      <h2>{t('customerDetailsTitle')}</h2>
      <div className="section-divider" />

      <div className="form-grid">
        <label>
          {t('customerName')}
          <input
            type="text"
            value={customer.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder={t('customerNamePlaceholder')}
          />
        </label>

        <label className="customer-phone-field">
          {t('phoneNumber')}
          <input
            type="tel"
            value={customer.phone}
            onChange={(e) => update('phone', e.target.value)}
            onFocus={() => setMatchesOpen(matches.length > 0)}
            onBlur={() => setTimeout(() => setMatchesOpen(false), 150)}
            placeholder={t('phonePlaceholder')}
          />
          {matchesOpen && (
            <ul className="customer-match-list">
              {matches.map((m) => (
                <li key={m.phone}>
                  <button type="button" className="product-match-button" onClick={() => selectMatch(m)}>
                    {m.name} — {m.phone}
                    {m.area ? ` · ${m.area}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>

        <label>
          {t('areaPlace')}
          <input
            type="text"
            value={customer.area}
            onChange={(e) => update('area', e.target.value)}
            placeholder={t('areaPlaceholder')}
          />
        </label>

        <label>
          {t('billMadeBy')}
          <select value={customer.pocName} onChange={(e) => update('pocName', e.target.value)}>
            <option value="">{t('selectPoc')}</option>
            {POC_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t('date')}
          <input type="date" value={customer.date} onChange={(e) => update('date', e.target.value)} />
        </label>

        <label>
          {t('billingMode')}
          <select
            value={customer.billingMode}
            onChange={(e) => update('billingMode', e.target.value)}
          >
            <option value="online">{t('online')}</option>
            <option value="offline">{t('offline')}</option>
          </select>
        </label>
      </div>

      {touched && !isValid && <p className="form-error">{t('fillAllFields')}.</p>}

      <div className="actions">
        <button className="btn-primary" onClick={handleNext}>
          {t('next')}
        </button>
      </div>
    </section>
  );
}
