// Local song library (localStorage). The cloud sync adapter (core/sync.js) works on top of it.

import { normalizeSong } from './song.js';

const KEY_SONGS = 'evochord.songs';
const KEY_PREFS = 'evochord.prefs';

export const DEFAULT_PREFS = { theme: 'dark', fontSize: 22, scrollSpeed: 3, showChords: true };

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

export function createStore(storage = globalThis.localStorage) {
  const st = storage ?? memoryStorage();
  const subs = new Set();

  const read = (key, fallback) => {
    try {
      const v = JSON.parse(st.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, v) => {
    try {
      st.setItem(key, JSON.stringify(v));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  };

  let songs = read(KEY_SONGS, []).filter((s) => s && s.id).map(normalizeSong);
  let prefs = { ...DEFAULT_PREFS, ...read(KEY_PREFS, {}) };
  const emit = () => subs.forEach((fn) => fn());

  return {
    /** Newest first. */
    list: () => songs.map((s, i) => [s, i]).sort((a, b) => b[0].updatedAt - a[0].updatedAt || b[1] - a[1]).map((x) => x[0]),
    get: (id) => songs.find((s) => s.id === id) || null,
    put(song) {
      const s = normalizeSong({ ...song, updatedAt: Date.now() });
      const i = songs.findIndex((x) => x.id === s.id);
      if (i >= 0) songs[i] = s;
      else songs.push(s);
      write(KEY_SONGS, songs);
      emit();
      return s;
    },
    remove(id) {
      songs = songs.filter((s) => s.id !== id);
      write(KEY_SONGS, songs);
      emit();
    },
    /** Same title + artist already in the library (used to avoid duplicate imports). */
    findSame: (title, artist) =>
      songs.find(
        (s) => s.title.trim().toLowerCase() === String(title).trim().toLowerCase() && s.artist.trim().toLowerCase() === String(artist).trim().toLowerCase()
      ) || null,
    prefs: () => ({ ...prefs }),
    setPrefs(p) {
      prefs = { ...prefs, ...p };
      write(KEY_PREFS, prefs);
      emit();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
