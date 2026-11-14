// Which web address shows which part of the app.
//
// The shop counter site and the owner's master dashboard are the same Vercel
// build served on two domains. On an owner domain every path opens the master
// dashboard; on the shop domain /admin is the old way in, kept working until
// the owner domain is confirmed live (then set ADMIN_ON_SHOP_SITE to false).

export const SHOP_ORIGIN = 'https://masala-billing-app.vercel.app';

export const ADMIN_HOSTS = ['shindraj-admin.vercel.app'];

export const ADMIN_ON_SHOP_SITE = true;

export function isAdminHost(hostname = window.location.hostname) {
  return ADMIN_HOSTS.includes(hostname) || hostname.startsWith('admin.');
}

// Links from the owner dashboard to shop pages must leave the owner domain,
// otherwise they would just reopen the dashboard.
export function shopUrl(path) {
  return isAdminHost() ? `${SHOP_ORIGIN}${path}` : path;
}
