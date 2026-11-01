import { useState } from 'react';
import { useLanguage } from '../i18n.jsx';

const POC_OPTIONS = ['Sachin', 'Bhaskar', 'Sanket', 'Shreyash', 'Suvarna', 'Rampal', 'Sonu'];

export default function CustomerDetails({ customer, onChange, onNext }) {
  const { t } = useLanguage();
  const [touched, setTouched] = useState(false);

  const isValid =
    customer.name.trim() &&
    customer.phone.trim() &&
    customer.area.trim() &&
    customer.pocName &&
    (customer.billingMode === 'online' || customer.store);

  function update(field, value) {
    onChange({ ...customer, [field]: value });
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

        <label>
          {t('phoneNumber')}
          <input
            type="tel"
            value={customer.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder={t('phonePlaceholder')}
          />
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

        {customer.billingMode === 'offline' && (
          <label>
            {t('store')}
            <select value={customer.store} onChange={(e) => update('store', e.target.value)}>
              <option value="">{t('selectStore')}</option>
              <option value="lalbaug">{t('lalbaug')}</option>
              <option value="sewri">{t('sewri')}</option>
            </select>
          </label>
        )}
      </div>

      {touched && !isValid && (
        <p className="form-error">
          {t('fillAllFields')}
          {customer.billingMode === 'offline' ? t('andSelectStore') : ''}.
        </p>
      )}

      <div className="actions">
        <button className="btn-primary" onClick={handleNext}>
          {t('next')}
        </button>
      </div>
    </section>
  );
}
