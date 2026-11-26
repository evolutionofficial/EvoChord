// Search → pick → import flow.
//
// 1. Library search has no match → "Cari di Chordtela" opens a Google search limited to Chordtela.
// 2. The user picks a song there and either shares it to Evo Chord (Android share target → /share)
//    or copies the link and comes back (the library shows a one-tap "Tempel link" banner).
// 3. The link is kept here as "pending" and the import screen picks it up and fetches it at once.

const KEY_PENDING = 'evochord.pendingUrl';
const KEY_SEARCH = 'evochord.searchAt';
const SEARCH_WINDOW_MS = 15 * 60 * 1000;

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Google results limited to Chordtela song pages. */
export function chordtelaSearchUrl(query) {
  const q = `${String(query ?? '').trim()} chord site:chordtela.com`;
  return 'https://www.google.com/search?q=' + encodeURIComponent(q);
}

export function markSearchStarted(now = Date.now()) {
  storage()?.setItem(KEY_SEARCH, String(now));
}

/** True for a while after "Cari di Chordtela", so the library can offer the paste banner. */
export function searchStartedRecently(now = Date.now()) {
  const t = Number(storage()?.getItem(KEY_SEARCH) || 0);
  return t > 0 && now - t < SEARCH_WINDOW_MS;
}

export function clearSearch() {
  storage()?.removeItem(KEY_SEARCH);
}

export function setPendingUrl(url) {
  storage()?.setItem(KEY_PENDING, String(url));
}

/** Returns the pending link once (and forgets it). */
export function takePendingUrl() {
  const s = storage();
  const u = s?.getItem(KEY_PENDING) || null;
  s?.removeItem(KEY_PENDING);
  return u;
}
