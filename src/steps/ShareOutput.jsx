import { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { typeLabel } from '../recipeCatalog.js';

function safeFileName(customer) {
  const base = `${customer.name || 'bill'}-${customer.date}`.trim().replace(/\s+/g, '_');
  return `${base}.png`;
}

export default function ShareOutput({ customer, bills, onStartOver }) {
  const printRef = useRef(null);
  const imageUrlRef = useRef(null);
  const [status, setStatus] = useState('generating'); // generating | ready | error
  const [imageUrl, setImageUrl] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);

  const grandTotal = bills.reduce((sum, b) => sum + b.total, 0);
  const isMultiItem = bills.length > 1;
  const fileName = safeFileName(customer);

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

  function downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleDownload() {
    if (imageBlob) downloadBlob(imageBlob);
  }

  function handleShare() {
    if (!imageBlob) return;

    const file = new File([imageBlob], fileName, { type: 'image/png' });
    const shareText = `Shindraj Masale bill for ${customer.name} (${customer.date}) — Total ₹${grandTotal}`;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Shindraj Masale Bill', text: shareText }).catch((err) => {
        if (err.name !== 'AbortError') console.error('Share failed', err);
      });
      return;
    }

    // Desktop / unsupported browsers: WhatsApp's web link can't attach a file. Open the
    // chat first (same tick as the click, so the popup blocker doesn't catch it), then
    // download the image for the operator to attach manually.
    const message = encodeURIComponent(`${shareText}. Image downloaded — attach it here.`);
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener');
    downloadBlob(imageBlob);
  }

  return (
    <section className="card">
      <h2>{isMultiItem ? 'Combined Order Summary' : 'Bill Summary'}</h2>
      <div className="section-divider" />

      <div ref={printRef} className="printable-summary">
        <div className="customer-recap">
          <p>
            <strong>{customer.name}</strong> — {customer.phone}
          </p>
          <p>
            {customer.area} · {customer.date} ·{' '}
            {customer.billingMode === 'online' ? 'Online' : `Offline (${typeLabel(customer.store)})`}
          </p>
        </div>

        {bills.map((bill, i) => (
          <div key={bill.orderItemId} className="bill-summary-block">
            <h3>
              {i + 1}. {typeLabel(bill.type)} {bill.qtyLabel} kg
            </h3>
            <table className="bill-table">
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th>Quantity</th>
                  <th>Amount (₹)</th>
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
                  <td colSpan={2}>Ingredients Subtotal</td>
                  <td>₹{bill.ingredientsSubtotal}</td>
                </tr>
                <tr className="making-charge-row">
                  <td colSpan={2}>Making Charge</td>
                  <td>₹{bill.makingCharge}</td>
                </tr>
                <tr className="total-row">
                  <td colSpan={2}>Total</td>
                  <td>₹{bill.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {isMultiItem && (
          <div className="grand-total">
            <span>Grand Total</span>
            <span>₹{grandTotal}</span>
          </div>
        )}
      </div>

      {status === 'generating' && <p className="hint">Preparing bill image…</p>}

      {status === 'ready' && imageUrl && (
        <div className="image-preview">
          <img src={imageUrl} alt="Generated bill preview" />
        </div>
      )}

      {status === 'error' && (
        <div className="image-error">
          <p className="form-error">Couldn't generate the bill image.</p>
          <button className="btn-secondary" onClick={generateImage}>
            Retry
          </button>
        </div>
      )}

      <div className="actions">
        <button className="btn-secondary" onClick={onStartOver}>
          Start New Order
        </button>
        <button className="btn-secondary" onClick={handleDownload} disabled={status !== 'ready'}>
          Download Image
        </button>
        <button className="btn-primary btn-accent" onClick={handleShare} disabled={status !== 'ready'}>
          Share to WhatsApp
        </button>
      </div>
    </section>
  );
}
