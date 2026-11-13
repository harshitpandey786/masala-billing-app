import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

// Owner-only setup for the shop logins used by LocationLogin.jsx -- one
// shared username/password per physical shop, done once per shop rather
// than per staff member (confirmed with the client). Same inline-edit
// pattern as the rest of /admin.
export default function AdminLocations() {
  const { t } = useLanguage();
  const [locations, setLocations] = useState([]);
  const [status, setStatus] = useState(supabase ? 'loading' : 'not_configured');
  const [savedFlash, setSavedFlash] = useState('');
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: '',
    login_username: '',
    login_password: '',
    admin_password: '',
  });
  const [addError, setAddError] = useState('');

  async function loadAll() {
    if (!supabase) return;
    setStatus('loading');
    const { data, error } = await supabase.from('locations').select('*').order('created_at');
    if (error) {
      console.error('Failed to load locations', error);
      setStatus('error');
      return;
    }
    setLocations(data || []);
    setStatus('ready');
  }

  useEffect(() => {
    loadAll();
  }, []);

  function flash() {
    setSavedFlash(t('saved'));
    setTimeout(() => setSavedFlash(''), 1500);
  }

  function fieldFor(loc, field) {
    return edits[loc.id]?.[field] !== undefined ? edits[loc.id][field] : loc[field] ?? '';
  }
  function setField(id, field, value) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }
  function isDirty(loc) {
    const e = edits[loc.id];
    if (!e) return false;
    return Object.entries(e).some(([k, v]) => String(v) !== String(loc[k] ?? ''));
  }

  async function saveRow(loc) {
    const e = edits[loc.id];
    if (!e) return;
    setSavingId(loc.id);
    const { error } = await supabase.from('locations').update(e).eq('id', loc.id);
    setSavingId(null);
    if (error) {
      console.error('Failed to save location', error);
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[loc.id];
      return next;
    });
    loadAll();
    flash();
  }

  async function addLocation() {
    setAddError('');
    if (!newLocation.name.trim() || !newLocation.login_username.trim() || !newLocation.login_password.trim()) {
      setAddError(t('locationFieldsRequired'));
      return;
    }
    const { error } = await supabase.from('locations').insert({
      name: newLocation.name.trim(),
      login_username: newLocation.login_username.trim(),
      login_password: newLocation.login_password,
      admin_password: newLocation.admin_password.trim() || null,
    });
    if (error) {
      setAddError(error.message);
      return;
    }
    setNewLocation({ name: '', login_username: '', login_password: '', admin_password: '' });
    setShowAddForm(false);
    loadAll();
    flash();
  }

  if (status === 'not_configured') return null;

  return (
    <section className="card admin-dashboard pricing-manager">
      <h2>{t('locationsManagerTitle')}</h2>

      {status === 'loading' && <p className="hint">{t('loadingResults')}</p>}
      {status === 'error' && <p className="form-error">{t('loadError')}</p>}

      {status === 'ready' && (
        <div className="pricing-section">
          {savedFlash && <p className="pricing-saved-flash">{savedFlash}</p>}

          <div className="pricing-section-header">
            <h3>{t('shopsTableTitle')}</h3>
            <button className="btn-secondary btn-small" onClick={() => setShowAddForm((v) => !v)}>
              {showAddForm ? t('cancel') : t('addShop')}
            </button>
          </div>

          {showAddForm && (
            <div className="pricing-add-form">
              <input
                placeholder={t('shopNamePlaceholder')}
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
              />
              <input
                placeholder={t('shopUsername')}
                value={newLocation.login_username}
                onChange={(e) => setNewLocation({ ...newLocation, login_username: e.target.value })}
              />
              <input
                placeholder={t('password')}
                value={newLocation.login_password}
                onChange={(e) => setNewLocation({ ...newLocation, login_password: e.target.value })}
              />
              <input
                placeholder={t('shopAdminPasswordPlaceholder')}
                value={newLocation.admin_password}
                onChange={(e) => setNewLocation({ ...newLocation, admin_password: e.target.value })}
              />
              <button className="btn-add btn-small" onClick={addLocation}>
                {t('addItem')}
              </button>
              {addError && <p className="form-error">{addError}</p>}
            </div>
          )}

          <div className="table-scroll">
            <table className="bill-table ledger-table">
              <thead>
                <tr>
                  <th>{t('shopNameLabel')}</th>
                  <th>{t('shopUsername')}</th>
                  <th>{t('password')}</th>
                  <th>{t('shopAdminPasswordLabel')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id} className="ledger-row">
                    <td>
                      <input
                        value={fieldFor(loc, 'name')}
                        onChange={(e) => setField(loc.id, 'name', e.target.value)}
                        className="pricing-cell-input"
                      />
                    </td>
                    <td>
                      <input
                        value={fieldFor(loc, 'login_username')}
                        onChange={(e) => setField(loc.id, 'login_username', e.target.value)}
                        className="pricing-cell-input"
                      />
                    </td>
                    <td>
                      <input
                        value={fieldFor(loc, 'login_password')}
                        onChange={(e) => setField(loc.id, 'login_password', e.target.value)}
                        className="pricing-cell-input"
                      />
                    </td>
                    <td>
                      <input
                        value={fieldFor(loc, 'admin_password')}
                        onChange={(e) => setField(loc.id, 'admin_password', e.target.value)}
                        className="pricing-cell-input"
                        placeholder={t('shopAdminPasswordPlaceholder')}
                      />
                    </td>
                    <td>
                      {isDirty(loc) && (
                        <button
                          className="btn-secondary btn-small"
                          onClick={() => saveRow(loc)}
                          disabled={savingId === loc.id}
                        >
                          {t('save')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
