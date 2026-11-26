// Import a song from a Chordtela link (via the Worker) or from pasted chord-sheet text.

import { parseChordSheet, isChordtelaSongUrl } from '../../core/chordsheet.js';
import { newSong } from '../../core/song.js';

export const ERRORS = {
  bad_url: 'Link harus halaman lagu Chordtela, contoh: https://www.chordtela.com/2021/07/judul-lagu.html',
  not_found: 'Halaman lagu tidak ditemukan di Chordtela.',
  no_chords: 'Tidak ada chord di halaman itu.',
  upstream: 'Chordtela sedang tidak bisa dibuka. Coba lagi sebentar lagi.',
  unreachable: 'Chordtela sedang tidak bisa dibuka. Coba lagi sebentar lagi.',
  offline: 'Tidak ada koneksi internet. Kamu tetap bisa menempel teks chord.',
  empty: 'Teksnya kosong atau tidak ada chord yang terbaca.',
};

/** Find a Chordtela song URL inside any text (a shared message often has extra words). */
export function findChordtelaUrl(text) {
  const m = /https?:\/\/(?:www\.)?chordtela\.com\/\d{4}\/\d{2}\/[a-z0-9-]+\.html/i.exec(String(text ?? ''));
  if (!m) return null;
  const u = m[0].replace(/^http:/i, 'https:');
  return isChordtelaSongUrl(u) ? u : null;
}

/**
 * @returns {Promise<{ok:true, result:object, ms:number} | {ok:false, error:string, message:string}>}
 */
export async function importFromChordtela(url, { fetchImpl = globalThis.fetch } = {}) {
  const clean = findChordtelaUrl(url);
  if (!clean) return fail('bad_url');
  const t0 = Date.now();
  let res;
  try {
    res = await fetchImpl('/api/chordtela?url=' + encodeURIComponent(clean));
  } catch {
    return fail('offline');
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* not JSON */
  }
  if (!res.ok || !body || body.error) return fail((body && body.error) || 'upstream');
  return { ok: true, result: body, ms: Date.now() - t0 };
}

/** Parse pasted chord-sheet text (works offline). */
export function importFromText(text) {
  const r = parseChordSheet(text);
  if (!r.lyrics.trim() || !r.chords.length) return fail('empty');
  return { ok: true, result: { ...r, source: { site: 'paste' } }, ms: 0 };
}

/** Build a library song from an import result. */
export function resultToSong(r) {
  return newSong({
    title: r.title || 'Tanpa judul',
    artist: r.artist || '',
    key: r.key || '',
    capo: r.capo || 0,
    lyrics: r.lyrics,
    chords: r.chords,
    source: r.source,
  });
}

function fail(error) {
  return { ok: false, error, message: ERRORS[error] || ERRORS.upstream };
}
