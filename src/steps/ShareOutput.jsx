import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { useLanguage, masalaTypeLabel, storeLabel } from '../i18n.jsx';
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

export default function ShareOutput({ customer, bills, onStartOver }) {
  const { t } = useLanguage();
  const printRef = useRef(null);
  const imageUrlRef = useRef(null);
  const [status, setStatus] = useState('generating'); // generating | ready | error
  const [imageUrl, setImageUrl] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [pdfStatus, setPdfStatus] = useState('idle'); // idle | generating | error

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
    <section className="card">
      <h2>{isMultiItem ? t('combinedOrderSummary') : t('billSummary')}</h2>
      <div className="section-divider" />

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
            {customer.billingMode === 'online' ? t('online') : `${t('offline')} (${storeLabel(t, customer.store)})`}
          </p>
          <p>
            {t('billMadeByLabel')}: {customer.pocName}
          </p>
        </div>

        {bills.map((bill, i) => (
          <div key={bill.orderItemId} className="bill-summary-block">
            <h3>
              {i + 1}. {masalaTypeLabel(t, bill.type)} {bill.qtyLabel} kg
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
                      {line.qty} {line.unit === 'piece' ? 'pcs' : 'g'}
                    </td>
                    <td>₹{line.amount}</td>
                  </tr>
                ))}
                <tr className="subtotal-row">
                  <td colSpan={2}>{t('ingredientsSubtotal')}</td>
                  <td>₹{bill.ingredientsSubtotal}</td>
                </tr>
                <tr className="making-charge-row">
                  <td colSpan={2}>{t('makingCharge')}</td>
                  <td>₹{bill.makingCharge}</td>
                </tr>
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

      {status === 'generating' && <p className="hint">{t('preparingImage')}</p>}

      {status === 'ready' && imageUrl && (
        <div className="image-preview">
          <img src={imageUrl} alt="Generated bill preview" />
        </div>
      )}

      {status === 'error' && (
        <div className="image-error">
          <p className="form-error">{t('couldNotGenerateImage')}</p>
          <button className="btn-secondary" onClick={generateImage}>
            {t('retry')}
          </button>
        </div>
      )}

      {pdfStatus === 'error' && <p className="form-error">{t('couldNotGenerateImage')}</p>}

      <div className="actions">
        <button className="btn-secondary" onClick={onStartOver}>
          {t('startNewOrder')}
        </button>
        <button className="btn-secondary" onClick={handleDownload} disabled={status !== 'ready'}>
          {t('downloadImage')}
        </button>
        <button
          className="btn-secondary"
          onClick={handleDownloadPdf}
          disabled={pdfStatus === 'generating'}
        >
          {pdfStatus === 'generating' ? t('preparingPdf') : t('downloadPdf')}
        </button>
        <button className="btn-primary btn-accent" onClick={handleShare} disabled={status !== 'ready'}>
          {t('shareToWhatsapp')}
        </button>
      </div>
    </section>
  );
}
