import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { AlertCircle, CheckCircle, File06, Image01, MessageChatCircle, Printer, QrCode01, RefreshCw01 } from '@untitledui/icons';
import { Button } from '@/components/base/buttons/button';
import { TextArea } from '@/components/base/textarea/textarea';
import { useLanguage, masalaTypeLabel, paymentMethodLabel, ingredientLabel } from '../i18n.jsx';
import PageHeader from '../components/shell/PageHeader.jsx';
import { updateBillNotes, markBillsPaid } from '../orderLogger.js';
import { detailsParts } from '../masalaDetails.js';
import { computeGstBreakup } from '../gst.js';
import { buildUpiLink } from '../upiQr.js';
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
  const [upiQrUrl, setUpiQrUrl] = useState(null);
  const [paid, setPaid] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const grandTotal = bills.reduce((sum, b) => sum + b.total, 0);
  const isMultiItem = bills.length > 1;
  const fileName = safeFileName(customer, 'png');
  const billIds = bills.map((b) => b.id).filter(Boolean);

  // A "Tax Invoice" with a GST breakup only makes sense once the shop has a
  // GSTIN on file (docs/supabase-setup.md §12c) -- otherwise this stays a
  // plain bill summary, same as before this feature existed.
  const gstin = location?.gstin;
  const gstBreakup = gstin ? computeGstBreakup(grandTotal, pricingConfig?.gst_rate_pct) : null;
  const invoiceNo = bills.find((b) => b.billNo)?.billNo;

  // Scan-and-pay QR, only once the operator picked UPI as the payment
  // method and a UPI id is on file to pay into -- the rotating handle they
  // picked on the final bill (Shreyas/Sachin/Didi/Mummy, see
  // data/pricing-config.json's upi_handles) if there is one, else the
  // shop's own VPA (docs/supabase-setup.md §14). There's no gateway here to
  // confirm it landed, so "Mark as paid" below is the operator's own
  // confirmation, not an automatic one.
  const upiHandles = pricingConfig?.upi_handles || [];
  const selectedHandle = upiHandles.find((h) => h.id === customer.upiHandleId);
  const upiVpa = selectedHandle?.vpa || location?.upi_vpa;
  const showUpiQr = !!upiVpa && customer.paymentMethod === 'upi';

  useEffect(() => {
    if (!showUpiQr) {
      setUpiQrUrl(null);
      return;
    }
    let cancelled = false;
    const link = buildUpiLink({
      vpa: upiVpa,
      payeeName: selectedHandle?.label || location?.name,
      amount: grandTotal,
      note: invoiceNo ? `Bill ${invoiceNo}` : customer.name,
    });
    QRCode.toDataURL(link, { margin: 1, width: 220 }).then((url) => {
      if (!cancelled) setUpiQrUrl(url);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUpiQr, upiVpa, grandTotal, invoiceNo]);

  async function handleMarkPaid() {
    setMarkingPaid(true);
    await markBillsPaid(billIds);
    setMarkingPaid(false);
    setPaid(true);
  }

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

  // Prints the same bill image that gets shared, from a hidden frame so the
  // page around it (sidebar, buttons) never ends up on paper.
  function handlePrint() {
    if (!imageUrl) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.title = safeFileName(customer, 'png').replace(/\.png$/, '');
    const style = doc.createElement('style');
    style.textContent = '@page { margin: 8mm; } body { margin: 0; } img { display: block; width: 100%; }';
    doc.head.appendChild(style);
    const img = doc.createElement('img');
    img.onload = () => {
      frame.contentWindow.addEventListener('afterprint', () => frame.remove());
      frame.contentWindow.focus();
      frame.contentWindow.print();
    };
    img.src = imageUrl;
    doc.body.appendChild(img);
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
                  {gstin && (
                    <p className="bill-gstin-line">
                      {t('taxInvoiceLabel')} · {t('gstinLabel')}: {gstin}
                      {invoiceNo ? ` · ${t('invoiceNoLabel')} ${invoiceNo}` : ''}
                    </p>
                  )}
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
                  {customer.paymentMethod
                    ? ` · ${t('paymentMethodLabel')}: ${paymentMethodLabel(t, customer.paymentMethod)}${selectedHandle ? ` (${selectedHandle.label})` : ''}`
                    : ''}
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
                  {detailsParts(bill.details, t).length > 0 && (
                    <p className="bill-item-details">{detailsParts(bill.details, t).join(' · ')}</p>
                  )}
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
                          <td>{ingredientLabel(line.code, pricingConfig?.rate_card, lang)}</td>
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

              {gstBreakup && (
                <div className="bill-tax-breakup">
                  <div className="bill-tax-breakup-row">
                    <span>{t('taxableValueLabel')}</span>
                    <span>₹{gstBreakup.taxableValue.toFixed(2)}</span>
                  </div>
                  <div className="bill-tax-breakup-row">
                    <span>{t('cgstLabel')}</span>
                    <span>₹{gstBreakup.cgst.toFixed(2)}</span>
                  </div>
                  <div className="bill-tax-breakup-row">
                    <span>{t('sgstLabel')}</span>
                    <span>₹{gstBreakup.sgst.toFixed(2)}</span>
                  </div>
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
          {showUpiQr && (
            <div className="flex flex-col items-center gap-3 border-b border-secondary px-5 py-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <QrCode01 className="size-4.5 shrink-0" />
                {t('scanToPayLabel')}
              </p>
              {upiQrUrl ? (
                <img src={upiQrUrl} alt={t('scanToPayLabel')} className="size-44 rounded-lg ring-1 ring-secondary" />
              ) : (
                <div className="flex size-44 items-center justify-center rounded-lg bg-secondary text-sm text-tertiary">
                  {t('loadingResults')}
                </div>
              )}
              <p className="text-lg font-bold text-primary tabular-nums">₹{grandTotal}</p>
              {paid ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-success-primary">
                  <CheckCircle className="size-4 shrink-0" />
                  {t('paymentConfirmedLabel')}
                </span>
              ) : (
                <Button size="md" color="secondary" className="w-full" onClick={handleMarkPaid} isLoading={markingPaid}>
                  {t('markAsPaidButton')}
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 border-b border-secondary px-5 py-5">
            <Button
              size="lg"
              iconLeading={Printer}
              onClick={handlePrint}
              isDisabled={status !== 'ready'}
              className="w-full"
            >
              {t('printBill')}
            </Button>
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
