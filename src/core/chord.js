// Chord names: parse, validate, transpose, and the chord-keyboard grammar.
// Pure functions, no DOM. Shared by the app and the Cloudflare Worker.

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// Root, accidental, quality/extensions, optional slash bass.
// Accepts the spellings found on Indonesian chord sites: Am7, C#m, Bbmaj7, Dsus4, Cadd9, G/B, F#m7b5, Cdim, Caug, C+, Em(add9) is NOT accepted.
const CHORD_RE = /^([A-G])([#b]?)((?:maj|min|m|M|dim|aug|sus|add|\+|°|ø)?\d*(?:(?:sus|add|maj|b|#|\+|-)?\d+)*)(?:\/([A-G])([#b]?))?$/;

/** @returns {{root:string, acc:string, quality:string, bass:string|null}|null} */
export function parseChord(name) {
  const m = CHORD_RE.exec(String(name ?? '').trim());
  if (!m) return null;
  return { root: m[1], acc: m[2], quality: m[3].replace(/^min/, 'm'), bass: m[4] ? m[4] + m[5] : null };
}

export const isChord = (name) => parseChord(name) !== null;

/** Pitch class 0–11 of a note name like "C#", "Bb", or null. */
export function pitchClass(note) {
  const m = /^([A-G])([#b]?)$/.exec(String(note ?? ''));
  if (!m) return null;
  return (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
}

/** Whether a key prefers flats when spelling transposed notes (F, Bb, Eb, Ab, Db, Gb and their minors). */
export function prefersFlats(key) {
  const p = parseChord(key);
  if (!p) return false;
  if (p.acc === 'b') return true;
  const minor = /^m(?!aj)/.test(p.quality);
  const pc = pitchClass(p.root + p.acc);
  const flatMajors = [5, 10, 3, 8, 1, 6]; // F Bb Eb Ab Db Gb
  const flatMinors = [2, 7, 0, 5, 10, 3]; // Dm Gm Cm Fm Bbm Ebm
  return (minor ? flatMinors : flatMajors).includes(pc);
}

function moveNote(note, semis, flats) {
  const pc = pitchClass(note);
  if (pc === null) return note;
  return (flats ? FLAT : SHARP)[(((pc + semis) % 12) + 12) % 12];
}

/** Transpose one chord name by semitones. Unknown text is returned unchanged. */
export function transposeChord(name, semis, { flats } = {}) {
  const p = parseChord(name);
  if (!p || !semis) return name;
  const useFlats = flats ?? p.acc === 'b';
  const root = moveNote(p.root + p.acc, semis, useFlats);
  const bass = p.bass ? '/' + moveNote(p.bass, semis, useFlats) : '';
  return root + p.quality + bass;
}

/** Transpose a key name (e.g. "G", "Bbm"); spelling follows the target key's convention. */
export function transposeKey(key, semis) {
  if (!key || !semis) return key || '';
  const sharp = transposeChord(key, semis, { flats: false });
  return prefersFlats(sharp) ? transposeChord(key, semis, { flats: true }) : sharp;
}

// ---------------------------------------------------------------------------
// Chord keyboard grammar (ported from EvoLyric v180).
// The buffer is the chord being typed; keys are the labels on the keyboard.

export const KEY_ROWS = [
  ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  ['#', 'b', 'm', '7', 'maj7', 'sus', '/'],
  ['2', '4', '6', '9', 'dim', 'aug', 'add'],
];
const TOKEN_END = /(maj7|sus|dim|aug|add|[A-G]|[#b]|m|\/|\d)$/;
const MAX_LEN = 12;

/** Whether pressing `key` is allowed after `buf`. */
export function canPress(buf, key) {
  if (/^[A-G]$/.test(key)) return true;
  if (buf.length >= MAX_LEN) return false;
  if (key === '#' || key === 'b') return /[A-G]$/.test(buf);
  if (key === 'm') return /^[A-G][#b]?$/.test(buf);
  if (key === '/') return /^[A-G]/.test(buf) && !buf.includes('/');
  return /^[A-G]/.test(buf) && !buf.includes('/');
}

/** New buffer after pressing `key`. A root key starts a new chord unless it follows "/". */
export function press(buf, key) {
  if (!canPress(buf, key)) return buf;
  if (/^[A-G]$/.test(key) && !buf.endsWith('/')) return key;
  return buf + key;
}

/** Remove the last token (e.g. "maj7" as a whole). */
export const backspace = (buf) => buf.replace(TOKEN_END, '');
