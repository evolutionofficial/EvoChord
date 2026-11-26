// Song model, shared with EvoLyric.
//
// A song is the same object EvoLyric stores, so both apps can read one library later:
//   { id, title, artist, lyrics, key, chords, capo, source, createdAt, updatedAt }
// - lyrics: plain text, one line per lyric line. "[Verse]" lines are section labels.
//   EvoLyric colour markup "{r:text}" may appear; it is ignored for chord positions.
// - chords: [{ l, c, n }]  l = raw line index in lyrics, c = character index in the
//   visible line text (always even: one box per 2 characters), n = chord name.
// See docs/ARCHITECTURE.md.

import { transposeChord, transposeKey, prefersFlats } from './chord.js';

export const SCHEMA = 1;

/** Visible text of a lyric line: EvoLyric colour markup removed. */
export const visibleText = (line) => String(line ?? '').replace(/\{[roygbiv]:([^{}]*)\}/g, '$1');

const SECTION_RE = /^\s*\[(.+)\]\s*$/;
export const sectionName = (line) => {
  const m = SECTION_RE.exec(line ?? '');
  return m ? m[1].trim() : null;
};
/** EvoLyric note lines ("{n|...}") are not lyrics. */
export const isNoteLine = (line) => /^\s*\{n[|}]/.test(line ?? '');
/** Rows without lyrics: beat rows ("|• · • ·|", see beats.js) and older "·" placeholder rows. */
export const isInstrumentalLine = (line) => /^[|•·\s]+$/.test(line ?? '') && /[•·]/.test(line ?? '');

/**
 * Chord boxes per row in the chord editor: the same for every row, so chords can also go
 * after the last word (at least 4 spare boxes) and on rows without lyrics.
 */
export function gridCells(song, { spare = 4, min = 16, max = 48 } = {}) {
  let widest = 0;
  for (const raw of String(song?.lyrics || '').split('\n')) {
    if (sectionName(raw) || isNoteLine(raw)) continue;
    widest = Math.max(widest, cellCount(raw));
  }
  for (const it of song?.chords || []) widest = Math.max(widest, (it.c >> 1) + 1);
  return Math.max(min, Math.min(max, widest + spare));
}

/**
 * Lyrics with each line padded with spaces so every chord box it uses exists in the text
 * (EvoLyric places chords by character, so chords after the last word need the spaces).
 */
export function padLyricsForChords(lyrics, chords) {
  const lines = String(lyrics || '').split('\n');
  for (const it of chords || []) {
    const raw = lines[it.l];
    if (raw == null || sectionName(raw)) continue;
    const need = it.c + 1 - visibleText(raw).length;
    if (need > 0) lines[it.l] = raw + ' '.repeat(need);
  }
  return lines.join('\n');
}

/** Number of chord boxes for a line (one per 2 visible characters). */
export const cellCount = (line) => Math.ceil(visibleText(line).length / 2);

let seq = 0;
export function makeId() {
  seq = (seq + 1) % 1e6;
  return 'c' + Date.now().toString(36) + seq.toString(36) + Math.random().toString(36).slice(2, 6);
}

export function newSong(fields = {}) {
  const now = Date.now();
  return normalizeSong({ id: makeId(), createdAt: now, updatedAt: now, ...fields });
}

/** Fill defaults and drop invalid chord items. Unknown fields are kept (they belong to EvoLyric). */
export function normalizeSong(x) {
  const s = { ...(x || {}) };
  s.id = String(s.id || makeId());
  s.title = String(s.title || '');
  s.artist = String(s.artist || '');
  s.lyrics = String(s.lyrics || '').replace(/\r\n?/g, '\n');
  s.key = String(s.key || '');
  s.capo = Math.max(0, Math.min(11, s.capo | 0));
  const n = s.lyrics.split('\n').length;
  s.chords = (Array.isArray(s.chords) ? s.chords : [])
    .filter((it) => it && typeof it.n === 'string' && it.n && it.l >= 0 && it.l < n && it.c >= 0)
    .map((it) => ({ l: it.l | 0, c: (it.c | 0) - ((it.c | 0) % 2), n: it.n }))
    .sort((a, b) => a.l - b.l || a.c - b.c);
  if (!s.chords.length) delete s.chords;
  if (!s.capo) delete s.capo;
  s.createdAt = s.createdAt || Date.now();
  s.updatedAt = s.updatedAt || s.createdAt;
  return s;
}

/**
 * Lines ready to render.
 * @returns {Array<{type:'section'|'lyric'|'instrumental'|'gap', l:number, text:string, chords:Array<{c:number,n:string}>}>}
 */
export function songLines(song, { transpose = 0 } = {}) {
  const by = new Map();
  const flats = transpose ? prefersFlats(transposeKey(song.key || firstChord(song) || 'C', transpose)) : undefined;
  for (const it of song.chords || []) {
    if (!by.has(it.l)) by.set(it.l, []);
    by.get(it.l).push({ c: it.c, n: transpose ? transposeChord(it.n, transpose, { flats }) : it.n });
  }
  return String(song.lyrics || '')
    .split('\n')
    .map((raw, l) => {
      const chords = by.get(l) || [];
      if (isNoteLine(raw)) return null;
      const sec = sectionName(raw);
      if (sec) return { type: 'section', l, text: sec, chords: [] };
      const text = visibleText(raw);
      if (!text.trim() && !chords.length) return { type: 'gap', l, text: '', chords: [] };
      return { type: isInstrumentalLine(text) ? 'instrumental' : 'lyric', l, text, chords };
    })
    .filter(Boolean);
}

export function firstChord(song) {
  return (song.chords && song.chords[0] && song.chords[0].n) || '';
}

/** Distinct chord names in order of first use. */
export function chordsUsed(song) {
  const seen = [];
  for (const it of song.chords || []) if (!seen.includes(it.n)) seen.push(it.n);
  return seen;
}

/** A copy of the song with every chord and the key moved by `semis` semitones (permanent transpose). */
export function transposeSong(song, semis) {
  if (!semis) return song;
  const key = transposeKey(song.key || firstChord(song), semis);
  const flats = prefersFlats(key);
  return normalizeSong({
    ...song,
    key: song.key ? key : song.key,
    chords: (song.chords || []).map((it) => ({ ...it, n: transposeChord(it.n, semis, { flats }) })),
    updatedAt: Date.now(),
  });
}
