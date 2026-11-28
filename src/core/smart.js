// Smart editor: section-linked chord editing for EvoChord.
//
// The sheet is `lines` (lyric lines + beat rows + labels) and `chords` [{l, c, n, o?}]: line, character offset (even, one
// box = 2 characters), name, and o = 1 for a chord that is "different" (overridden) in its section.
//
// Sections start at a label line ("[Verse 2]", "[Reff]"). Sections of the same kind (all Verses, all Choruses …) are
// twins. A position in one section matches a position in a twin by the row number inside the section (rows = lines with
// boxes: lyric lines and beat rows) and the same box. Same lyrics → the very same letters; different lyrics → the same
// row and box. A twin with fewer rows simply has no partner for the extra rows.
//
// With linking on, an edit goes to every twin, except chords marked o there. With linking off, an edited chord that
// has twins is marked o, so later linked edits from other sections leave it alone. "Follow again" removes the mark and
// takes the value of its twins. All functions are pure: they return a new chords array.

import { transposeTo, transposeKey, parseChord, pitchClass, prefersFlats, normKey } from './chord.js';
import { isBeatLine, readBeatLine, barShape } from './beats.js';
import { visibleText, isNoteLine } from './song.js';

const LABEL = /^\s*\[([^\]]+)\]\s*$/;
const ALIAS = [
  [/^(pre ?(chorus|reff?|refrain))$/, 'pre-chorus'],
  [/^(chorus|reff?|refrain)$/, 'chorus'],
  [/^(verse|bait)$/, 'verse'],
  [/^(interlude|musik|music|instrumental|solo)$/, 'interlude'],
  [/^(outro|coda|ending)$/, 'outro'],
];

/** Kind of a section from its name: "Verse 2" → verse, "Reff" → chorus, "Pre-Reff" → pre-chorus. */
export function sectionType(name) {
  let s = String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  s = s.replace(/\s*\b(x\s*\d+|\d+\s*x|\d+|i{1,3}|iv|v|vi{0,3})$/, '').replace(/-/g, ' ').trim();
  if (!s) return null;
  for (const [re, t] of ALIAS) if (re.test(s)) return t;
  return s;
}

/** Sections of a sheet: [{type, name, label (line index or -1), rows: [line indices with boxes]}]. */
export function sectionsOf(lines) {
  const out = [{ type: null, name: '', label: -1, rows: [] }];
  lines.forEach((ln, l) => {
    const m = LABEL.exec(ln);
    if (m) { out.push({ type: sectionType(m[1]), name: m[1].trim(), label: l, rows: [] }); return; }
    if (!String(ln).trim() || isNoteLine(ln)) return;
    out[out.length - 1].rows.push(l);
  });
  return out;
}

function where(secs, l) {
  for (const s of secs) { const i = s.rows.indexOf(l); if (i >= 0) return { s, i }; }
  return null;
}

/** Lines in twin sections that match line l (same row number). */
export function twinLines(lines, l, secs = sectionsOf(lines)) {
  const w = where(secs, l);
  if (!w || !w.s.type) return [];
  return secs.filter((s) => s !== w.s && s.type === w.s.type && s.rows[w.i] != null).map((s) => s.rows[w.i]);
}

/** Lines of the section that holds line l, and of its twins (rows of all of them). */
export function sectionRows(lines, l, { twins = false } = {}) {
  const secs = sectionsOf(lines), w = where(secs, l);
  if (!w) return { own: [], others: [] };
  const others = twins && w.s.type ? secs.filter((s) => s !== w.s && s.type === w.s.type).flatMap((s) => s.rows) : [];
  return { own: w.s.rows.slice(), others };
}

const key = (l, c) => l + ':' + c;
const toMap = (chords) => new Map((chords || []).map((x) => [key(x.l, x.c), { ...x }]));
const fromMap = (m) => [...m.values()].sort((a, b) => a.l - b.l || a.c - b.c);
const clean = (x) => { const y = { ...x }; delete y.o; return y; };

/**
 * Write a chord name at (l, c); '' deletes it.
 * @param {{linked?:boolean}} opt linked = "Edit per Section" is on
 */
export function setChord(lines, chords, l, c, name, { linked = false } = {}) {
  const m = toMap(chords), k = key(l, c), was = m.get(k), tw = twinLines(lines, l);
  const put = (mm, kk, ll, base) => { if (name) mm.set(kk, { ...(base || {}), l: ll, c, n: name }); else mm.delete(kk); };
  if (was && was.o) { put(m, k, l, was); return fromMap(m); } // a chord that is different stays its own
  put(m, k, l, was && clean(was));
  if (name && !linked && tw.length) m.get(k).o = 1;
  if (linked) for (const t of tw) { const tk = key(t, c), tc = m.get(tk); if (tc && tc.o) continue; put(m, tk, t, tc && clean(tc)); }
  return fromMap(m);
}

/** "Follow again": the chord at (l, c) loses its mark and takes the value of its twins (first one without a mark). */
export function followAgain(lines, chords, l, c) {
  const m = toMap(chords), k = key(l, c), tw = twinLines(lines, l);
  const src = tw.map((t) => ({ t, x: m.get(key(t, c)) })).find((p) => !(p.x && p.x.o));
  if (!src) { const x = m.get(k); if (x) delete x.o; return fromMap(m); }
  if (src.x) m.set(k, { ...clean(src.x), l, c }); else m.delete(k);
  return fromMap(m);
}

function shiftOne(m, l, c, dir, maxC) {
  const to = c + 2 * dir, from = m.get(key(l, c));
  if (!from || to < 0 || to >= maxC || m.has(key(l, to))) return null;
  m.delete(key(l, c)); m.set(key(l, to), { ...from, c: to });
  return to;
}

/**
 * Move one chord a box left (dir -1) or right (+1). It stops at the edge and in front of another chord.
 * @returns {{chords, c}} c = where the chord is now (unchanged when it could not move)
 */
export function moveChord(lines, chords, l, c, dir, { linked = false, maxC = 96 } = {}) {
  const m = toMap(chords), was = m.get(key(l, c));
  if (!was) return { chords: fromMap(m), c };
  const tw = twinLines(lines, l), to = shiftOne(m, l, c, dir, maxC);
  if (to == null) return { chords: fromMap(m), c };
  if (was.o || !linked) { if (tw.length) m.get(key(l, to)).o = 1; return { chords: fromMap(m), c: to }; }
  for (const t of tw) { const tc = m.get(key(t, c)); if (tc && !tc.o) shiftOne(m, t, c, dir, maxC); }
  return { chords: fromMap(m), c: to };
}

function shiftRow(m, l, dir, maxC, { skipMarked = false, mark = false } = {}) {
  const row = [...m.values()].filter((x) => x.l === l && !(skipMarked && x.o)).sort((a, b) => (dir > 0 ? b.c - a.c : a.c - b.c));
  let moved = 0;
  for (const x of row) { const to = shiftOne(m, l, x.c, dir, maxC); if (to != null) { moved++; if (mark) m.get(key(l, to)).o = 1; } }
  return moved;
}

/** Move all chords of line l one box together; nothing moves when the first one in that direction is at the edge.
    In linked twins only unmarked chords move, each stopping in front of a chord that stays. */
export function moveRow(lines, chords, l, dir, { linked = false, maxC = 96 } = {}) {
  const m = toMap(chords), tw = twinLines(lines, l), row = [...m.values()].filter((x) => x.l === l);
  if (!row.length) return fromMap(m);
  const edge = dir > 0 ? Math.max(...row.map((x) => x.c)) + 2 >= maxC : Math.min(...row.map((x) => x.c)) <= 0;
  if (edge) return fromMap(m);
  shiftRow(m, l, dir, maxC, { mark: !linked && tw.length > 0 });
  if (linked) for (const t of tw) shiftRow(m, t, dir, maxC, { skipMarked: true });
  return fromMap(m);
}

function rowSlots(line, perRow) {
  if (isBeatLine(line)) {
    const { timeSig } = readBeatLine(line), { cells } = barShape(timeSig), n = Math.floor(visibleText(line).length / (cells * 2));
    return Array.from({ length: Math.max(1, n) }, (_, b) => b * cells * 2);
  }
  const L = visibleText(line).length, k = Math.max(1, perRow | 0), set = new Set();
  for (let i = 0; i < k; i++) { const c = Math.floor((i * Math.max(L, 2)) / k); set.add(c - (c % 2)); }
  return [...set].sort((a, b) => a - b);
}

/**
 * Fill a chord progression ("G D Em C") into the rows of the section that holds line l: perRow chords per lyric line
 * (evenly spread), one per bar on beat rows, repeating the pattern. Chords marked o are kept.
 */
export function fillPattern(lines, chords, l, pattern, { perRow = 2, linked = false } = {}) {
  const pat = (pattern || []).map(String).filter(Boolean);
  if (!pat.length) return chords.slice();
  const m = toMap(chords), secs = sectionsOf(lines), w = where(secs, l);
  if (!w) return fromMap(m);
  const targets = [w.s, ...(linked && w.s.type ? secs.filter((s) => s !== w.s && s.type === w.s.type) : [])];
  for (const s of targets) {
    let i = 0;
    for (const r of s.rows) {
      for (const x of [...m.values()]) if (x.l === r && !x.o) m.delete(key(r, x.c));
      for (const c of rowSlots(lines[r], perRow)) { const n = pat[i++ % pat.length]; if (!m.has(key(r, c))) m.set(key(r, c), { l: r, c, n }); }
    }
  }
  return fromMap(m);
}

/** Every chord named `from` in the song becomes `to` (marks are kept). */
export function replaceAll(chords, from, to) {
  return (chords || []).map((x) => (x.n === from ? { ...x, n: to } : { ...x }));
}

export const countNamed = (chords, n) => (chords || []).filter((x) => x.n === n).length;

/**
 * Transpose chords permanently. Whole song (no `line`): every chord, marked or not; returns the new key too.
 * One section (`line` = any line in it): its chords, plus its twins' unmarked chords when linked.
 */
export function transposeChords(lines, chords, semis, { key: songKey = '', line = null, linked = false } = {}) {
  const k = normKey(songKey), toKey = k ? transposeKey(k, semis) : '';
  const target = toKey || transposeKey((chords && chords[0] && chords[0].n) || 'C', semis);
  if (line == null) return { chords: (chords || []).map((x) => ({ ...x, n: transposeTo(x.n, semis, target) })), key: toKey };
  const { own, others } = sectionRows(lines, line, { twins: linked });
  const ownSet = new Set(own), otherSet = new Set(others);
  return {
    chords: (chords || []).map((x) => (ownSet.has(x.l) || (otherSet.has(x.l) && !x.o) ? { ...x, n: transposeTo(x.n, semis, target) } : { ...x })),
    key: k,
  };
}

/** Variants offered when a chord is held: D → D, Dm, D7, Dmaj7, Dm7, Dsus2, Dsus4, Dadd9, D6, D9, Ddim, Daug, D/F#, D/A. */
export function variants(name, songKey = '') {
  const p = parseChord(name);
  if (!p) return [];
  const root = p.root + p.acc, pc = pitchClass(root), k = normKey(songKey);
  const flats = p.acc === 'b' || (parseChord(k) ? prefersFlats(k) : false);
  const NOTE = flats ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const minor = /^m(?!aj)/.test(p.quality), third = NOTE[(pc + (minor ? 3 : 4)) % 12], fifth = NOTE[(pc + 7) % 12];
  const base = minor ? root + 'm' : root;
  const list = minor
    ? [base, root, base + '7', base + '9', root + 'm7b5', base + 'add9', root + 'sus2', root + 'sus4', root + 'dim', base + '/' + third, base + '/' + fifth, root + 'm6', root + 'mmaj7', root + '7']
    : [root, root + 'm', root + '7', root + 'maj7', root + 'm7', root + 'sus2', root + 'sus4', root + 'add9', root + '6', root + '9', root + 'dim', root + 'aug', root + '/' + third, root + '/' + fifth];
  return [...new Set(list)];
}
