// One Supabase Realtime broadcast channel per shop, scoped by location id --
// a phone running ScanPage sends barcodes into it, OrderBuilder's
// ProductScanner listens on the counter screen. No table/row is written;
// broadcast is fire-and-forget and needs no new schema or RLS policy.
export function remoteScanChannelName(locationId) {
  return `remote-scan:${locationId}`;
}

export function scanPageUrl(locationId) {
  return `${window.location.origin}/scan?loc=${encodeURIComponent(locationId)}`;
}
