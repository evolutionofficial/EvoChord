// Editing one lyric row in the chord editor, keeping its chords and highlights on the right letters.
//
// A row is stored as raw text that may hold highlight markers ("{y:kata}"); chords sit on the visible
// text (markers removed) at even character offsets (one box = 2 characters).
// Rules when the text changes:
//  - letters before the change keep their chords;
//  - letters after the change move with the text;
//  - a chord on letters that were deleted goes away, unless new text was typed in the same place
//    (a word replaced by another keeps its chord);
//  - chords after the end of the lyrics (in the extra boxes) move with the end of the line.

const MARK = /\{([roygbiv]):([^{}]*)\}/g;

/** Split raw text into visible text and highlight ranges [{s,e,c}] (e exclusive). */
export function toMarks(raw) {
  const s = String(raw ?? '');
  const marks = [];
  let text = '', last = 0, m;
  MARK.lastIndex = 0;
  while ((m = MARK.exec(s))) {
    text += s.slice(last, m.index);
    marks.push({ s: text.length, e: text.length + m[2].length, c: m[1] });
    text += m[2];
    last = m.index + m[0].length;
  }
  text += s.slice(last);
  return { text, marks: marks.filter((k) => k.e > k.s) };
}

/** Rebuild raw text from visible text and highlight ranges. */
export function fromMarks(text, marks) {
  const ms = (marks || []).filter((k) => k.e > k.s).sort((a, b) => a.s - b.s);
  let out = '', at = 0;
  for (const k of ms) {
    const s = Math.max(k.s, at), e = Math.min(k.e, text.length);
    if (e <= s) continue;
    out += text.slice(at, s) + '{' + k.c + ':' + text.slice(s, e) + '}';
    at = e;
  }
  return out + text.slice(at);
}

/** The one changed stretch between two texts: prefix length p, deleted count del, inserted count ins. */
export function diffText(a, b) {
  a = String(a ?? ''); b = String(b ?? '');
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  return { p, del: a.length - p - s, ins: b.length - p - s };
}

const even = (c) => Math.max(0, c - (c % 2));

// Keep one chord per box: the first one wins.
function uniq(chords) {
  const seen = new Set();
  return chords.filter((x) => (seen.has(x.c) ? false : (seen.add(x.c), true))).sort((a, b) => a.c - b.c);
}

// Where each old letter went: map[i] = new index, or -1 when it was deleted. Rows are short, so a
// letter-by-letter LCS is cheap and copes with several edits made before the row is committed.
function alignText(a, b) {
  const n = a.length, m = b.length, map = new Array(n).fill(-1);
  if (n * m > 4e6) { const { p, del, ins } = diffText(a, b); for (let i = 0; i < n; i++) map[i] = i < p ? i : i >= p + del ? i - del + ins : -1; return map; }
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { map[i] = j; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return map;
}

/**
 * New text for a row.
 * @param {string} oldRaw row as stored (may hold highlight markers)
 * @param {string} newText the row's new visible text (what the person typed)
 * @param {{c:number,n:string}[]} chords chords of this row
 * @returns {{raw:string, chords:{c:number,n:string}[]}}
 */
export function editRow(oldRaw, newText, chords) {
  const { text: old, marks } = toMarks(oldRaw);
  newText = String(newText ?? '').replace(/[\r\n]/g, ' ');
  const map = alignText(old, newText);
  const prevKept = (i) => { while (i >= 0 && map[i] < 0) i--; return i; };
  const nextKept = (i) => { while (i < old.length && map[i] < 0) i++; return i; };
  const out = [];
  for (const ch of chords || []) {
    const c = ch.c | 0;
    let to;
    if (c >= old.length) to = c + newText.length - old.length; // extra boxes after the lyrics
    else if (map[c] >= 0) to = map[c];
    else if (c + 1 < old.length && map[c + 1] >= 0) to = map[c + 1] - 1;
    else {
      // both letters of the box were deleted: keep the chord only if new text was typed there
      const pb = prevKept(c - 1), pa = nextKept(c + 2);
      const lo = pb >= 0 ? map[pb] + 1 : 0, hi = pa < old.length ? map[pa] : newText.length;
      if (hi <= lo) continue;
      to = lo;
    }
    out.push({ ...ch, c: even(Math.max(0, to)) });
  }
  const nm = [];
  for (const k of marks) {
    const a = nextKept(k.s), b = prevKept(k.e - 1);
    if (a < k.e && b >= k.s && b >= a) nm.push({ s: map[a], e: map[b] + 1, c: k.c });
  }
  return { raw: fromMarks(newText, nm), chords: uniq(out) };
}

/** Enter inside a row at visible position `at`: the row is cut in two, chords go with their letters. */
export function splitRow(raw, at, chords) {
  const { text, marks } = toMarks(raw);
  at = Math.max(0, Math.min(at | 0, text.length));
  const left = text.slice(0, at), right = text.slice(at).replace(/^ +/, '');
  const cut = text.length - right.length; // leading spaces of the new row are dropped
  const a = [], b = [];
  for (const ch of chords || []) {
    if (ch.c < at) a.push({ ...ch });
    else b.push({ ...ch, c: even(ch.c - cut) });
  }
  const ma = [], mb = [];
  for (const k of marks) {
    if (k.s < at) ma.push({ s: k.s, e: Math.min(k.e, at), c: k.c });
    if (k.e > cut) mb.push({ s: Math.max(0, k.s - cut), e: k.e - cut, c: k.c });
  }
  return [
    { raw: fromMarks(left.replace(/ +$/, ''), ma), chords: uniq(a) },
    { raw: fromMarks(right, mb), chords: uniq(b) },
  ];
}

/** Backspace at the start of row B: B joins the end of row A (a space between them when both have text). */
export function joinRows(rawA, chordsA, rawB, chordsB) {
  const A = toMarks(rawA), B = toMarks(rawB);
  const gap = A.text && B.text && !/ $/.test(A.text) && !/^ /.test(B.text) ? ' ' : '';
  const off = A.text.length + gap.length;
  const text = A.text + gap + B.text;
  const marks = [...A.marks, ...B.marks.map((k) => ({ s: k.s + off, e: k.e + off, c: k.c }))];
  const chords = [
    ...(chordsA || []).filter((x) => x.c < off).map((x) => ({ ...x })),
    ...(chordsB || []).map((x) => ({ ...x, c: even(x.c + off) })),
  ];
  return { raw: fromMarks(text, marks), chords: uniq(chords), at: A.text.length };
}
