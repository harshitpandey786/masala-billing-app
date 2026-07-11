import { useState } from 'react';

export default function CustomerDetails({ customer, onChange, onNext }) {
  const [touched, setTouched] = useState(false);

  const isValid =
    customer.name.trim() &&
    customer.phone.trim() &&
    customer.area.trim() &&
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
      <h2>Customer Details</h2>
      <div className="section-divider" />

      <div className="form-grid">
        <label>
          Customer Name
          <input
            type="text"
            value={customer.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Suresh Patil"
          />
        </label>

        <label>
          Phone Number
          <input
            type="tel"
            value={customer.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="e.g. 98200 12345"
          />
        </label>

        <label>
          Area / Place
          <input
            type="text"
            value={customer.area}
            onChange={(e) => update('area', e.target.value)}
            placeholder="e.g. Lalbaug, Mumbai"
          />
        </label>

        <label>
          Date
          <input type="date" value={customer.date} onChange={(e) => update('date', e.target.value)} />
        </label>

        <label>
          Billing Mode
          <select
            value={customer.billingMode}
            onChange={(e) => update('billingMode', e.target.value)}
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </label>

        {customer.billingMode === 'offline' && (
          <label>
            Store
            <select value={customer.store} onChange={(e) => update('store', e.target.value)}>
              <option value="">Select store</option>
              <option value="lalbaug">Lalbaug</option>
              <option value="sewri">Sewri</option>
            </select>
          </label>
        )}
      </div>

      {touched && !isValid && (
        <p className="form-error">Please fill in all fields{customer.billingMode === 'offline' ? ' and select a store' : ''}.</p>
      )}

      <div className="actions">
        <button className="btn-primary" onClick={handleNext}>
          Next
        </button>
      </div>
    </section>
  );
}
