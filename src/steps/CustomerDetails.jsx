import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowRight, Phone } from '@untitledui/icons';
import { Avatar } from '@/components/base/avatar/avatar';
import { ButtonGroup, ButtonGroupItem } from '@/components/base/button-group/button-group';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Select } from '@/components/base/select/select';
import { searchCustomers } from '../customerSearch.js';
import { useLanguage } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';

const POC_OPTIONS = ['Sachin', 'Bhaskar', 'Sanket', 'Shreyash', 'Suvarna', 'Rampal', 'Sonu'];

const initials = (name) =>
  (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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

  const missing = (value) => touched && !String(value || '').trim();

  return (
    <>
      <PageHeader title={t('customerDetailsTitle')} description={t('customerDetailsHint')} />

      <div className="px-4 pt-8 lg:px-8">
        <div className="max-w-3xl rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:p-6">
            <div className="relative">
              <Input
                label={t('phoneNumber')}
                type="tel"
                icon={Phone}
                value={customer.phone}
                onChange={(v) => update('phone', v)}
                onFocus={() => setMatchesOpen(matches.length > 0)}
                onBlur={() => setTimeout(() => setMatchesOpen(false), 150)}
                placeholder={t('phonePlaceholder')}
                isInvalid={missing(customer.phone)}
                autoFocus
              />
              <AnimatePresence>
                {matchesOpen && (
                  <motion.ul
                    className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-72 overflow-auto rounded-lg bg-primary py-1 shadow-lg ring-1 ring-secondary"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
                    style={{ transformOrigin: 'top' }}
                  >
                    <li className="px-3 pt-1.5 pb-1 text-xs font-semibold text-quaternary">{t('returningCustomers')}</li>
                    {matches.map((m) => (
                      <li key={m.phone} className="px-1.5">
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectMatch(m)}
                          className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition duration-100 ease-linear hover:bg-primary_hover"
                        >
                          <Avatar size="sm" initials={initials(m.name)} />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium text-primary">{m.name}</span>
                            <span className="truncate text-sm text-tertiary">
                              {m.phone}
                              {m.area ? ` · ${m.area}` : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            <Input
              label={t('customerName')}
              value={customer.name}
              onChange={(v) => update('name', v)}
              placeholder={t('customerNamePlaceholder')}
              isInvalid={missing(customer.name)}
            />

            <Input
              label={t('areaPlace')}
              value={customer.area}
              onChange={(v) => update('area', v)}
              placeholder={t('areaPlaceholder')}
              isInvalid={missing(customer.area)}
            />

            <Select
              label={t('billMadeBy')}
              placeholder={t('selectPoc')}
              items={POC_OPTIONS.map((name) => ({ id: name, label: name }))}
              selectedKey={customer.pocName || null}
              onSelectionChange={(key) => update('pocName', key ? String(key) : '')}
              isInvalid={touched && !customer.pocName}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>

            <Input label={t('date')} type="date" value={customer.date} onChange={(v) => update('date', v)} />

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-secondary">{t('billingMode')}</span>
              <ButtonGroup
                size="md"
                selectedKeys={[customer.billingMode]}
                onSelectionChange={(keys) => {
                  const next = [...keys][0];
                  if (next) update('billingMode', String(next));
                }}
                className="w-full [&>*]:flex-1 [&>*]:justify-center"
              >
                <ButtonGroupItem id="online">{t('online')}</ButtonGroupItem>
                <ButtonGroupItem id="offline">{t('offline')}</ButtonGroupItem>
              </ButtonGroup>
            </div>
          </div>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-secondary px-5 py-4 sm:flex-row sm:items-center lg:px-6">
            {touched && !isValid ? (
              <p className="flex items-center gap-2 text-sm text-error-primary">
                <AlertCircle className="size-4 shrink-0" />
                {t('fillAllFields')}
              </p>
            ) : (
              <span />
            )}
            <Button size="lg" iconTrailing={ArrowRight} onClick={handleNext}>
              {t('next')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
