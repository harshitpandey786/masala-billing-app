const STORAGE_KEY = 'shindraj_location';

// Kept in sessionStorage: the shop stays signed in while the browser tab is
// open (reloads, moving between Billing / Customers / Shop Admin), but
// closing the tab or pressing Log out asks for the shop's username and
// password again. The owner asked for this so a counter computer left open
// overnight, or a link opened on someone else's device, doesn't go straight
// into the shop.
//
// Earlier builds kept the login in localStorage forever; that copy is
// removed on first read so already-signed-in devices are asked once more.
function dropLegacyLogin() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function getStoredLocation() {
  dropLegacyLogin();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeLocation(location) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // sessionStorage unavailable -- login just won't survive a reload.
  }
}

export function clearStoredLocation() {
  dropLegacyLogin();
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
