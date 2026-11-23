import { Fragment, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Plus, XClose } from '@untitledui/icons';
import { Badge } from '@/components/base/badges/badges';
import { Button } from '@/components/base/buttons/button';
import { ButtonUtility } from '@/components/base/buttons/button-utility';
import { Input } from '@/components/base/input/input';
import { supabase } from '../supabaseClient.js';
import { useLanguage } from '../i18n.jsx';

// The rotating UPI handles the counter at one shop picks from on the Final
// Bill screen when a customer pays by UPI (see FinalBill.jsx /
// ShareOutput.jsx) -- each shop keeps its own list (Online's handles aren't
// offered at Lalbagh, etc), set by whichever shop is selected above (see
// AdminDashboard.jsx's shop selector, shared with the Pricing page). Same
// inline-edit table pattern as AdminLocations.jsx, plus delete since this
// list is meant to be added to and trimmed over time, not fixed at four.
export default function AdminUpiHandles({ locationId }) {
  const { t } = useLanguage();
  const [handles, setHandles] = useState([]);
  const [status, setStatus] = useState(supabase ? 'loading' : 'not_configured');
  const [savedFlash, setSavedFlash] = useState('');
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [newHandle, setNewHandle] = useState({ label: '', vpa: '' });
  const [addError, setAddError] = useState('');
  const [saveErrors, setSaveErrors] = useState({});

  async function loadAll() {
    if (!supabase || !locationId) return;
    setStatus('loading');
    const { data, error } = await supabase
      .from('upi_handles')
      .select('*')
      .eq('location_id', locationId)
      .order('created_at');
    if (error) {
      console.error('Failed to load UPI handles', error);
      setStatus(/relation .* does not exist|column .* does not exist/i.test(error.message || '') ? 'not_migrated' : 'error');
      return;
    }
    setHandles(data || []);
    setStatus('ready');
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  function flash() {
    setSavedFlash(t('saved'));
    setTimeout(() => setSavedFlash(''), 1500);
  }

  function fieldFor(h, field) {
    return edits[h.id]?.[field] !== undefined ? edits[h.id][field] : h[field] ?? '';
  }
  function setField(id, field, value) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }
  function isDirty(h) {
    const e = edits[h.id];
    if (!e) return false;
    return Object.entries(e).some(([k, v]) => String(v) !== String(h[k] ?? ''));
  }

  async function saveRow(h) {
    const e = edits[h.id];
    if (!e) return;
    setSavingId(h.id);
    setSaveErrors((prev) => ({ ...prev, [h.id]: '' }));
    const { error } = await supabase.from('upi_handles').update(e).eq('id', h.id);
    setSavingId(null);
    if (error) {
      console.error('Failed to save UPI handle', error);
      setSaveErrors((prev) => ({ ...prev, [h.id]: error.message }));
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[h.id];
      return next;
    });
    loadAll();
    flash();
  }

  async function removeHandle(h) {
    setDeletingId(h.id);
    const { error } = await supabase.from('upi_handles').delete().eq('id', h.id);
    setDeletingId(null);
    if (error) {
      console.error('Failed to delete UPI handle', error);
      setSaveErrors((prev) => ({ ...prev, [h.id]: error.message }));
      return;
    }
    loadAll();
    flash();
  }

  async function addHandle() {
    setAddError('');
    if (!newHandle.label.trim()) {
      setAddError(t('upiHandleNameRequired'));
      return;
    }
    const { error } = await supabase
      .from('upi_handles')
      .insert({ location_id: locationId, label: newHandle.label.trim(), vpa: newHandle.vpa.trim() || null });
    if (error) {
      setAddError(error.message);
      return;
    }
    setNewHandle({ label: '', vpa: '' });
    loadAll();
    flash();
  }

  if (status === 'not_configured') return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary px-5 py-5 lg:px-6">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-primary">{t('upiHandlesTableTitle')}</p>
            {status === 'ready' && (
              <Badge size="sm" color="gray" type="modern">
                {handles.length}
              </Badge>
            )}
            {savedFlash && (
              <span className="flex items-center gap-1 text-sm font-medium text-success-primary">
                <CheckCircle className="size-4" />
                {savedFlash}
              </span>
            )}
          </div>
          <p className="text-sm text-tertiary">{t('upiHandlesTableHint')}</p>
        </div>
      </div>

      {status === 'loading' && <p className="px-5 py-6 text-sm text-tertiary">{t('loadingResults')}</p>}
      {status === 'error' && <p className="px-5 py-6 text-sm text-error-primary">{t('loadError')}</p>}
      {status === 'not_migrated' && <p className="px-5 py-6 text-sm text-tertiary">{t('upiHandlesNotMigrated')}</p>}

      {status === 'ready' && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-secondary">
                <tr className="border-b border-secondary">
                  {[t('upiHandleNameLabel'), t('upiVpaLabel')].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold whitespace-nowrap text-quaternary">
                      {h}
                    </th>
                  ))}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {handles.map((h) => (
                  <Fragment key={h.id}>
                    <tr className="border-b border-secondary last:border-b-0">
                      <td className="px-5 py-3">
                        <Input
                          size="sm"
                          aria-label={t('upiHandleNameLabel')}
                          value={String(fieldFor(h, 'label'))}
                          onChange={(v) => setField(h.id, 'label', v)}
                          className="min-w-32"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <Input
                          size="sm"
                          aria-label={t('upiVpaLabel')}
                          placeholder={t('upiVpaPlaceholder')}
                          value={String(fieldFor(h, 'vpa'))}
                          onChange={(v) => setField(h.id, 'vpa', v)}
                          className="min-w-44"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {isDirty(h) && (
                            <Button size="sm" color="secondary" onClick={() => saveRow(h)} isDisabled={savingId === h.id}>
                              {t('save')}
                            </Button>
                          )}
                          <ButtonUtility
                            size="sm"
                            color="tertiary"
                            tooltip={t('remove')}
                            icon={XClose}
                            isDisabled={deletingId === h.id}
                            onClick={() => removeHandle(h)}
                          />
                        </div>
                      </td>
                    </tr>
                    {saveErrors[h.id] && (
                      <tr className="border-b border-secondary bg-error-primary last:border-b-0">
                        <td colSpan={3} className="px-5 py-2">
                          <p className="flex items-center gap-2 text-sm text-error-primary">
                            <AlertCircle className="size-4 shrink-0" />
                            {saveErrors[h.id]}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-secondary bg-secondary px-5 py-4 sm:flex-row sm:items-end lg:px-6">
            <Input
              size="sm"
              label={t('upiHandleNameLabel')}
              placeholder={t('upiHandleNamePlaceholder')}
              value={newHandle.label}
              onChange={(v) => setNewHandle({ ...newHandle, label: v })}
              className="sm:w-44"
            />
            <Input
              size="sm"
              label={t('upiVpaLabel')}
              placeholder={t('upiVpaPlaceholder')}
              value={newHandle.vpa}
              onChange={(v) => setNewHandle({ ...newHandle, vpa: v })}
              className="sm:w-56"
            />
            <Button size="sm" iconLeading={Plus} onClick={addHandle}>
              {t('addItem')}
            </Button>
            {addError && <p className="text-sm text-error-primary">{addError}</p>}
          </div>
        </>
      )}
    </div>
  );
}
