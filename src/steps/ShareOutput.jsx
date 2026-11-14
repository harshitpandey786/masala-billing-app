import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { AlertCircle, File06, Image01, MessageChatCircle, RefreshCw01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { TextArea } from '@/components/base/textarea/textarea';
import { useLanguage, masalaTypeLabel } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';
import { updateBillNotes } from '../orderLogger.js';
import pricingConfig from '../../data/pricing-config.json' with { type: 'json' };

const businessInfo = pricingConfig.business_info || {};

function safeFileName(customer, ext) {
  const base = `${customer.name || 'bill'}-${customer.date}`.trim().replace(/\s+/g, '_');
  return `${base}.${ext}`;
}

// wa.me needs a full international number with no symbols. Indian mobile numbers are
// entered as 10 digits without a country code, so assume +91 when that's what we see.
function formatPhoneForWhatsApp(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `91${digits}` : digits;
}

export default function ShareOutput({ customer, bills, onStartOver, pricingConfig, location }) {
  const { t, lang } = useLanguage();
  const printRef = useRef(null);
  const imageUrlRef = useRef(null);
  const [status, setStatus] = useState('generating'); // generating | ready | error
  const [imageUrl, setImageUrl] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [pdfStatus, setPdfStatus] = useState('idle'); // idle | generating | error
  const [notes, setNotes] = useState('');

  const grandTotal = bills.reduce((sum, b) => sum + b.total, 0);
  const isMultiItem = bills.length > 1;
  const fileName = safeFileName(customer, 'png');

  async function generateImage() {
    setStatus('generating');
    try {
      const canvas = await html2canvas(printRef.current, {
        backgroundColor: '#f0e4c8',
        scale: 2,
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('canvas produced no blob');
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
      const url = URL.createObjectURL(blob);
      imageUrlRef.current = url;
      setImageUrl(url);
      setImageBlob(blob);
      setStatus('ready');
    } catch (err) {
      console.error('Bill image generation failed', err);
      setStatus('error');
    }
  }

  // Pre-generate as soon as the summary is on screen so Share/Download are a single
  // synchronous step from the user's click. Browsers drop the "user activation" that
  // window.open/navigator.share need if there's an async gap first, and html2canvas
  // alone takes 500ms+ -- too long to run inside the click handler itself.
  useEffect(() => {
    generateImage();
    return () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render the bill image (and save the note) a beat after the operator
  // stops typing -- debounced since html2canvas is too slow to run on every
  // keystroke. touchedNotesRef skips this on mount (generateImage() above
  // already covers the initial, note-less render) but still fires if they
  // type then clear the field back to empty.
  const touchedNotesRef = useRef(false);
  const billIds = bills.map((b) => b.id).filter(Boolean);
  useEffect(() => {
    if (!touchedNotesRef.current) {
      touchedNotesRef.current = true;
      return;
    }
    const id = setTimeout(() => {
      generateImage();
      updateBillNotes(billIds, notes);
    }, 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleDownload() {
    if (imageBlob) downloadBlob(imageBlob, fileName);
  }

  async function handleDownloadPdf() {
    setPdfStatus('generating');
    try {
      // Loaded on demand -- jsPDF is only needed for this one action, so it
      // shouldn't bloat the initial bundle every operator downloads up front.
      const { nodeToPdfBlob } = await import('../pdfExport.js');
      const blob = await nodeToPdfBlob(printRef.current);
      downloadBlob(blob, safeFileName(customer, 'pdf'));
      setPdfStatus('idle');
    } catch (err) {
      console.error('Bill PDF generation failed', err);
      setPdfStatus('error');
    }
  }

  function handleShare() {
    if (!imageBlob) return;

    const shareText = `Shindraj Masale bill for ${customer.name} (${customer.date}) — Total ₹${grandTotal}`;
    const targetPhone = customer.billingMode === 'online' ? formatPhoneForWhatsApp(customer.phone) : '';

    if (targetPhone) {
      // Online orders always open the customer's own chat directly -- that's the whole
      // point for this billing mode. WhatsApp's web link can only pre-fill text, not
      // attach a file (no website can both target a specific contact AND auto-attach an
      // image -- that's a WhatsApp/OS restriction, not something this app can route
      // around), so the image downloads at the same time for a quick manual attach in
      // the chat that's now already open.
      const message = encodeURIComponent(`${shareText}. Bill image downloaded — attach it here.`);
      window.open(`https://wa.me/${targetPhone}?text=${message}`, '_blank', 'noopener');
      downloadBlob(imageBlob, fileName);
      return;
    }

    // Offline orders (or no phone on file) have no specific chat to target, so prefer
    // the native share sheet when it can attach the image directly.
    const file = new File([imageBlob], fileName, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Shindraj Masale Bill', text: shareText }).catch((err) => {
        if (err.name !== 'AbortError') console.error('Share failed', err);
      });
      return;
    }

    const message = encodeURIComponent(`${shareText}. Bill image downloaded — attach it here.`);
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener');
    downloadBlob(imageBlob, fileName);
  }

  return (
    <>
      <PageHeader
        title={isMultiItem ? t('combinedOrderSummary') : t('billSummary')}
        description={`${customer.name} · ${customer.phone} · ${t('grandTotal')} ₹${grandTotal}`}
        actions={
          <Button color="secondary" size="md" iconLeading={RefreshCw01} onClick={onStartOver}>
            {t('startNewOrder')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 px-4 pt-8 lg:px-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-4 rounded-xl bg-secondary p-4 ring-1 ring-secondary ring-inset sm:p-6">
          <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl shadow-sm ring-1 ring-secondary">
            <div ref={printRef} className="printable-summary">
              <div className="bill-letterhead">
                <img src="/logo-mark.png" alt="Shindraj Masale logo" className="bill-letterhead-logo" />
                <div>
                  <h2 className="bill-letterhead-title">{t('appName')}</h2>
                  <p className="bill-letterhead-tagline">{t('tagline')}</p>
                </div>
              </div>

              <div className="customer-recap">
                <p>
                  <strong>{customer.name}</strong> — {customer.phone}
                </p>
                <p>
                  {customer.area} · {customer.date} ·{' '}
                  {customer.billingMode === 'online' ? t('online') : t('offline')}
                  {location?.name ? ` · ${location.name}` : ''}
                </p>
                <p>
                  {t('billMadeByLabel')}: {customer.pocName}
                </p>
              </div>

              {notes && (
                <p className="bill-notes-recap">
                  <strong>{t('billNotesLabel')}:</strong> {notes}
                </p>
              )}

              {bills.map((bill, i) => (
                <div key={bill.orderItemId} className="bill-summary-block">
                  <h3>
                    {i + 1}.{' '}
                    {bill.kind === 'product'
                      ? `${bill.type} — ${bill.qtyLabel}`
                      : `${masalaTypeLabel(t, bill.type, pricingConfig?.masala_types, lang)} ${bill.qtyLabel} kg`}
                    {bill.billNo ? ` · ${t('billNoLabel')} ${bill.billNo}` : ''}
                  </h3>
                  <table className="bill-table">
                    <thead>
                      <tr>
                        <th>{t('particulars')}</th>
                        <th>{t('quantity')}</th>
                        <th>{t('amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bill.lineItems.map((line) => (
                        <tr key={line.code}>
                          <td>{line.code}</td>
                          <td>
                            {line.qty} {line.unit === 'piece' ? 'pcs' : line.unit === 'kg' ? 'kg' : 'g'}
                          </td>
                          <td>₹{line.amount}</td>
                        </tr>
                      ))}
                      {bill.kind !== 'product' && (
                        <>
                          <tr className="subtotal-row">
                            <td colSpan={2}>{t('ingredientsSubtotal')}</td>
                            <td>₹{bill.ingredientsSubtotal}</td>
                          </tr>
                          <tr className="making-charge-row">
                            <td colSpan={2}>{t('makingCharge')}</td>
                            <td>₹{bill.makingCharge}</td>
                          </tr>
                        </>
                      )}
                      <tr className="total-row">
                        <td colSpan={2}>{t('total')}</td>
                        <td>₹{bill.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}

              {isMultiItem && (
                <div className="grand-total">
                  <span>{t('grandTotal')}</span>
                  <span>₹{grandTotal}</span>
                </div>
              )}

              {(businessInfo.address || businessInfo.follow_us) && (
                <div className="bill-footer">
                  {businessInfo.address && <p>{businessInfo.address}</p>}
                  {businessInfo.follow_us && (
                    <p>
                      {t('followUsAt')}: {businessInfo.follow_us}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="flex flex-col rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset xl:sticky xl:top-6">
          <div className="flex flex-col gap-2 border-b border-secondary px-5 py-5">
            <Button
              size="lg"
              iconLeading={MessageChatCircle}
              onClick={handleShare}
              isDisabled={status !== 'ready'}
              isLoading={status === 'generating'}
              className="w-full"
            >
              {t('shareToWhatsapp')}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button color="secondary" size="md" iconLeading={Image01} onClick={handleDownload} isDisabled={status !== 'ready'}>
                {t('downloadImage')}
              </Button>
              <Button color="secondary" size="md" iconLeading={File06} onClick={handleDownloadPdf} isLoading={pdfStatus === 'generating'}>
                {pdfStatus === 'generating' ? t('preparingPdf') : t('downloadPdf')}
              </Button>
            </div>
            {status === 'generating' && <p className="text-sm text-tertiary">{t('preparingImage')}</p>}
            {(status === 'error' || pdfStatus === 'error') && (
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-sm text-error-primary">
                  <AlertCircle className="size-4 shrink-0" />
                  {t('couldNotGenerateImage')}
                </p>
                {status === 'error' && (
                  <Button color="link-color" size="sm" onClick={generateImage}>
                    {t('retry')}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 border-b border-secondary px-5 py-5">
            <TextArea
              label={t('billNotesLabel')}
              value={notes}
              onChange={setNotes}
              placeholder={t('billNotesPlaceholder')}
              rows={3}
              hint={t('billNotesHint')}
            />
          </div>

          {status === 'ready' && imageUrl && (
            <div className="flex flex-col gap-2 px-5 py-5">
              <p className="text-sm font-medium text-secondary">{t('sharedImagePreview')}</p>
              <img src={imageUrl} alt="Generated bill preview" className="w-full rounded-lg ring-1 ring-secondary" />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
