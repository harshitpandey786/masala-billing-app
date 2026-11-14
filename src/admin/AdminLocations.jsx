import { useEffect, useState } from 'react';
import { CheckCircle, Plus, XClose } from '@untitledui/icons';
import { Badge } from '@/components/base/badges/badges';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

// Owner-only setup for the shop logins used by LocationLogin.jsx -- one
// shared username/password per physical shop, done once per shop rather
// than per staff member (confirmed with the client). Same inline-edit
// pattern as the rest of /admin.
//
// A plain <table> rather than Untitled's react-aria Table: every cell holds a
// text input, and a grid's keyboard navigation/typeahead would fight typing.
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

  const cellInput = (loc, field, placeholder) => (
    <Input
      size="sm"
      aria-label={placeholder}
      placeholder={placeholder}
      value={String(fieldFor(loc, field))}
      onChange={(v) => setField(loc.id, field, v)}
      className="min-w-36"
    />
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary px-5 py-4">
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold text-primary">{t('shopsTableTitle')}</p>
          {status === 'ready' && (
            <Badge size="sm" color="gray" type="modern">
              {locations.length}
            </Badge>
          )}
          {savedFlash && (
            <span className="flex items-center gap-1 text-sm font-medium text-success-primary">
              <CheckCircle className="size-4" />
              {savedFlash}
            </span>
          )}
        </div>
        <Button
          size="sm"
          color={showAddForm ? 'secondary' : 'primary'}
          iconLeading={showAddForm ? XClose : Plus}
          onClick={() => setShowAddForm((v) => !v)}
        >
          {showAddForm ? t('cancel') : t('addShop')}
        </Button>
      </div>

      {status === 'loading' && <p className="px-5 py-6 text-sm text-tertiary">{t('loadingResults')}</p>}
      {status === 'error' && <p className="px-5 py-6 text-sm text-error-primary">{t('loadError')}</p>}

      {status === 'ready' && showAddForm && (
        <div className="flex flex-col gap-3 border-b border-secondary bg-secondary px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Input
              size="sm"
              label={t('shopNameLabel')}
              placeholder={t('shopNamePlaceholder')}
              value={newLocation.name}
              onChange={(v) => setNewLocation({ ...newLocation, name: v })}
            />
            <Input
              size="sm"
              label={t('shopUsername')}
              value={newLocation.login_username}
              onChange={(v) => setNewLocation({ ...newLocation, login_username: v })}
            />
            <Input
              size="sm"
              label={t('password')}
              value={newLocation.login_password}
              onChange={(v) => setNewLocation({ ...newLocation, login_password: v })}
            />
            <Input
              size="sm"
              label={t('shopAdminPasswordLabel')}
              placeholder={t('shopAdminPasswordPlaceholder')}
              value={newLocation.admin_password}
              onChange={(v) => setNewLocation({ ...newLocation, admin_password: v })}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" iconLeading={Plus} onClick={addLocation}>
              {t('addItem')}
            </Button>
            {addError && <p className="text-sm text-error-primary">{addError}</p>}
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-secondary">
              <tr className="border-b border-secondary">
                {[t('shopNameLabel'), t('shopUsername'), t('password'), t('shopAdminPasswordLabel')].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold whitespace-nowrap text-quaternary">
                    {h}
                  </th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-b border-secondary last:border-b-0">
                  <td className="px-5 py-3">{cellInput(loc, 'name', t('shopNameLabel'))}</td>
                  <td className="px-5 py-3">{cellInput(loc, 'login_username', t('shopUsername'))}</td>
                  <td className="px-5 py-3">{cellInput(loc, 'login_password', t('password'))}</td>
                  <td className="px-5 py-3">{cellInput(loc, 'admin_password', t('shopAdminPasswordPlaceholder'))}</td>
                  <td className="px-5 py-3 text-right">
                    {isDirty(loc) && (
                      <Button size="sm" color="secondary" onClick={() => saveRow(loc)} isDisabled={savingId === loc.id}>
                        {t('save')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
