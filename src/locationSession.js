const STORAGE_KEY = 'shindraj_location';

// Persisted in localStorage (not sessionStorage) -- the shop logs in once on
// its device and stays logged in across reloads/restarts, per the client's
// requirement that staff never have to pick their shop "every now and then."
export function getStoredLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeLocation(location) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // localStorage unavailable -- login just won't persist across reloads.
  }
}

export function clearStoredLocation() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
