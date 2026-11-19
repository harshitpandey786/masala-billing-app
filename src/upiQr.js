// Builds the UPI deep link a payer's app turns into a scan-and-pay QR, with
// this bill's exact amount pre-filled. No payment gateway, no API keys, no
// fees -- it pays straight into the shop's own UPI id (VPA), the same as a
// printed static QR code at the counter except the amount is already
// filled in. See docs/supabase-setup.md §14.
//
// The app has no way to know the payment actually landed (that needs a real
// gateway account with webhooks) -- the operator confirms it the normal way
// (their own phone's payment-received notification/sound) and taps "Mark as
// paid" in ShareOutput.jsx.
export function buildUpiLink({ vpa, payeeName, amount, note }) {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName || 'Shindraj Masale',
    am: String(Math.round(Number(amount) || 0)),
    cu: 'INR',
  });
  if (note) params.set('tn', note);
  return `upi://pay?${params.toString()}`;
}
