import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { supabase } from './supabaseClient.js';
import { remoteScanChannelName } from './remoteScan.js';
import { useLanguage } from './i18n.jsx';
import LanguageToggle from './components/LanguageToggle.jsx';

// Opened on a phone (via the "Scan with phone" QR on the counter screen),
// never on the billing counter itself. It has no shop login of its own --
// the shop's location id travels in the ?loc= link so this page can join
// that shop's realtime channel and nothing else.
//
// Decoding goes through ZXing (pure JS, canvas-based) rather than the
// native BarcodeDetector API -- BarcodeDetector only ships in Chromium, so
// an iPhone's Safari would otherwise get no camera scanning at all.
export default function ScanPage() {
  const { t } = useLanguage();
  const locationId = new URLSearchParams(window.location.search).get('loc');
  const videoRef = useRef(null);
  const channelRef = useRef(null);
  const manualInputRef = useRef(null);
  const lastSentRef = useRef({ code: null, at: 0 });
  const [connected, setConnected] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [lastSentCode, setLastSentCode] = useState(null);
  const [manualCode, setManualCode] = useState('');

  // The shared manifest's start_url is "/" (billing), so "Add to Home Screen"
  // from here would open the counter login instead of this scanner. Without a
  // manifest, the phone saves this exact /scan?loc=... address instead.
  useEffect(() => {
    document.querySelector('link[rel="manifest"]')?.remove();
    document.title = 'Shindraj Scanner';
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', 'Shindraj Scanner');
  }, []);

  useEffect(() => {
    if (!supabase || !locationId) return;
    const channel = supabase.channel(remoteScanChannelName(locationId));
    channel.subscribe((status) => setConnected(status === 'SUBSCRIBED'));
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [locationId]);

  function sendCode(rawCode) {
    const code = String(rawCode || '').trim();
    if (!code || !channelRef.current) return;
    // A held-up barcode gets decoded many times a second; only forward it
    // once every couple of seconds so the counter doesn't see a flood.
    const now = Date.now();
    if (lastSentRef.current.code === code && now - lastSentRef.current.at < 2500) return;
    lastSentRef.current = { code, at: now };
    channelRef.current.send({ type: 'broadcast', event: 'scan', payload: { code } });
    setLastSentCode(code);
    window.setTimeout(() => setLastSentCode((c) => (c === code ? null : c)), 1800);
  }

  useEffect(() => {
    if (!locationId || !videoRef.current) return;
    let stopped = false;
    let controls = null;

    async function start() {
      try {
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current,
          (result, err) => {
            // Right after pairing, the camera is often still pointed at the
            // counter's own pairing QR -- that's a link, never a product barcode.
            if (result && !/^https?:\/\//i.test(result.getText())) sendCode(result.getText());
            else if (err && !(err instanceof NotFoundException)) {
              // A real decode error (not just "no code in this frame yet").
              console.error('Barcode decode error', err);
            }
          }
        );
        if (stopped) controls.stop();
      } catch (err) {
        if (!stopped) setCameraError(err?.message || 'Camera unavailable');
      }
    }

    start();
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [locationId]);

  if (!locationId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black p-6 text-center text-white">
        <p className="text-sm text-white/80">{t('scanPageNoLocation')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-black text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold">{t('scanPageTitle')}</p>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/90 p-1 shadow-sm backdrop-blur-sm">
            <LanguageToggle />
          </div>
          <span
            className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-500'}`}
            title={connected ? 'connected' : 'connecting…'}
          />
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/70" />
        {cameraError && (
          <div className="absolute inset-x-4 top-4 rounded-lg bg-red-600/90 px-3 py-2 text-sm">
            {t('scanPageCameraErrorPrefix')} {cameraError}
          </div>
        )}
        {lastSentCode && (
          <div className="absolute inset-x-4 bottom-6 rounded-lg bg-green-600/90 px-3 py-2 text-center text-sm font-semibold">
            {t('scanPageSentPrefix')} {lastSentCode}
          </div>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-white/10 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          sendCode(manualCode);
          setManualCode('');
          // A paired Bluetooth/USB scanner gun "types" the code + Enter like a
          // keyboard, same as the counter's own scanner field -- keep focus
          // here so the next scan lands in the box without tapping it again.
          manualInputRef.current?.focus();
        }}
      >
        <input
          ref={manualInputRef}
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder={t('scanPageManualPlaceholder')}
          className="flex-1 rounded-lg bg-white/10 px-3 py-3 text-base text-white placeholder-white/40 outline-none"
        />
        <button type="submit" className="rounded-lg bg-white px-4 py-3 font-semibold text-black">
          {t('scanPageSendButton')}
        </button>
      </form>
    </div>
  );
}
