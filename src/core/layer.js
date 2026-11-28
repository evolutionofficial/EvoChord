// The chord layer: EvoLyric owns the lyrics, EvoChord only adds to them.
//
// In the shared database a song keeps EvoLyric's lyrics untouched. EvoChord' additions are stored beside them:
//   chords: [{l,c,n}]            chords on the lyric lines (l = lyric line index, c = character offset)
//   rows:   [{at,text,ch:[{c,n}]}] lines EvoChord adds between lyric lines (beat rows, section labels, blank
//                                lines); `at` = index of the lyric line they come before (lyrics length = at the end)
// On the device EvoChord works on one merged sheet: the lyric lines with the rows put in, and every chord on its
// merged line. `lyr` keeps the lyrics as they came, so the sheet can be split again without changing a letter.

const norm = (s) => String(s ?? '').replace(/\s+$/, '');

/**
 * Lyrics + rows → one sheet.
 * @returns {{lyrics:string, chords:{l:number,c:number,n:string}[], lyr:string}}
 */
export function mergeLayer(lyrics, chords, rows) {
  const lyr = String(lyrics ?? '');
  const L = lyr === '' ? [] : lyr.split('\n');
  const R = (Array.isArray(rows) ? rows : []).map((r, i) => ({ ...r, i, at: Math.max(0, Math.min(L.length, r.at | 0)) }))
    .sort((a, b) => a.at - b.at || a.i - b.i);
  const out = [], idx = new Array(L.length), ch = [];
  let k = 0;
  for (let i = 0; i <= L.length; i++) {
    while (k < R.length && R[k].at === i) {
      const r = R[k++];
      for (const x of r.ch || []) ch.push({ ...x, l: out.length, c: x.c | 0, n: String(x.n) });
      out.push(String(r.text ?? ''));
    }
    if (i < L.length) { idx[i] = out.length; out.push(L[i]); }
  }
  for (const x of chords || []) if (x && x.l >= 0 && x.l < L.length) ch.push({ ...x, l: idx[x.l], c: x.c | 0, n: String(x.n) });
  ch.sort((a, b) => a.l - b.l || a.c - b.c);
  return { lyrics: out.join('\n'), chords: ch, lyr };
}

// Which sheet lines are lyric lines: LCS of the sheet against the lyrics (trailing spaces ignored, so lines padded
// for chords past their end still match). Returns lyricIndex per sheet line, or -1 for a line of the layer.
export function sheetMap(sheet, lyr) {
  const B = String(sheet ?? '').split('\n').map(norm);
  const A = String(lyr ?? '') === '' ? [] : String(lyr).split('\n').map(norm);
  const n = A.length, m = B.length, map = new Array(m).fill(-1);
  if (!n) return map;
  if (n * m > 4e6) { for (let j = 0; j < Math.min(n, m); j++) map[j] = j; return map; }
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { map[j] = i; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
  return map;
}

/**
 * One sheet → the lyrics as they came + chords on them + rows. The lyrics returned are always `lyr`, letter for
 * letter: a sheet line that is not one of them becomes a row.
 */
export function splitLayer(sheet, chords, lyr) {
  lyr = String(lyr ?? '');
  const S = String(sheet ?? '').split('\n');
  const map = sheetMap(sheet, lyr);
  const nL = lyr === '' ? 0 : lyr.split('\n').length;
  // `at` of a layer line = the lyric index of the next lyric line below it
  const nextLyric = new Array(S.length);
  let nx = nL;
  for (let j = S.length - 1; j >= 0; j--) { if (map[j] >= 0) nx = map[j]; nextLyric[j] = nx; }
  const rows = [], rowOf = new Map();
  S.forEach((t, j) => { if (map[j] < 0) { rowOf.set(j, rows.length); rows.push({ at: nextLyric[j], text: norm(t), ch: [] }); } });
  const out = [];
  for (const x of chords || []) {
    if (!x || x.l < 0 || x.l >= S.length) continue;
    if (map[x.l] >= 0) out.push({ ...x, l: map[x.l], c: x.c | 0, n: String(x.n) });
    else { const { l, ...rest } = x; rows[rowOf.get(x.l)].ch.push({ ...rest, c: x.c | 0, n: String(x.n) }); }
  }
  // a sheet that is all layer and no lyrics, and blank rows at the very end, need not be kept
  while (rows.length && rows[rows.length - 1].at === nL && !rows[rows.length - 1].text && !rows[rows.length - 1].ch.length) rows.pop();
  out.sort((a, b) => a.l - b.l || a.c - b.c);
  return { lyrics: lyr, chords: out, rows };
}

/** True for sheet lines that are lyrics (locked in EvoChord), false for lines of the layer. */
export function lyricMask(sheet, lyr) {
  return sheetMap(sheet, lyr).map((i) => i >= 0);
}

// ---------------------------------------------------------------------------
// "Get chords from Chordtela" for a song that already has its lyrics: the chords of the Chordtela sheet are put on
// the song's own lines; its lyrics are not changed. Lines are matched loosely (case, punctuation and spaces do not
// count), chords move letter by letter onto the matching line, and instrumental beat rows (with the section label
// right above them, e.g. [Intro]) are added where they belong. Lines with no match keep no chords.

const loose = (s) => String(s ?? '').toLowerCase().replace(/\{[roygbiv]:([^{}]*)\}/g, '$1').replace(/[^\p{L}\p{N}]+/gu, '');
const isBeat = (s) => /^\s*\|[•·\s|]*\|\s*$/.test(String(s ?? '')) && /•/.test(String(s));
const isSec = (s) => /^\s*\[[^\]]+\]\s*$/.test(String(s ?? ''));

/**
 * @param {string} sheet the song as shown in EvoChord (lyric lines + any layer lines)
 * @param {{l,c,n}[]} chords its chords now (lines that get chords from Chordtela lose their old ones)
 * @param {string} src the Chordtela sheet (lyrics with its beat rows)
 * @param {{l,c,n}[]} srcChords chords of the Chordtela sheet
 * @param {(raw:string,text:string,ch:{c,n}[])=>{chords:{c,n}[]}} moveRow how a row's chords follow a changed text
 *        (EvoCore.lineedit.editRow)
 * @returns {{lyrics:string, chords:{l,c,n}[], matched:number, lines:number}}
 */
export function importChords(sheet, chords, src, srcChords, moveRow) {
  const T = String(sheet ?? '').split('\n'), S = String(src ?? '').split('\n');
  const tk = T.map((l) => (isBeat(l) || isSec(l) ? '' : loose(l))), sk = S.map((l) => (isBeat(l) || isSec(l) ? '' : loose(l)));
  // LCS on the lines that have words
  const ti = tk.map((k, i) => (k ? i : -1)).filter((i) => i >= 0), si = sk.map((k, i) => (k ? i : -1)).filter((i) => i >= 0);
  const n = si.length, m = ti.length, pair = new Map();
  if (n && m && n * m <= 4e6) {
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let a = n - 1; a >= 0; a--) for (let b = m - 1; b >= 0; b--) dp[a][b] = sk[si[a]] === tk[ti[b]] ? dp[a + 1][b + 1] + 1 : Math.max(dp[a + 1][b], dp[a][b + 1]);
    let a = 0, b = 0;
    while (a < n && b < m) { if (sk[si[a]] === tk[ti[b]]) { pair.set(si[a], ti[b]); a++; b++; } else if (dp[a + 1][b] >= dp[a][b + 1]) a++; else b++; }
  }
  const byLine = (list) => { const o = new Map(); for (const x of list || []) { if (!o.has(x.l)) o.set(x.l, []); o.get(x.l).push({ c: x.c | 0, n: String(x.n) }); } return o; };
  const sCh = byLine(srcChords), tCh = byLine(chords);
  const vis = (s) => String(s).replace(/\{[roygbiv]:([^{}]*)\}/g, '$1');
  // chords for matched target lines
  const got = new Map();
  for (const [s, t] of pair) {
    const c = sCh.get(s) || [];
    got.set(t, c.length ? moveRow(vis(S[s]), vis(T[t]), c).chords : []);
  }
  // instrumental rows of the source to insert: beat rows not followed by matched words, with their label
  const ins = new Map(); // target index → lines to put before it
  const nextT = (s) => { for (let k = s + 1; k < S.length; k++) if (pair.has(k)) return pair.get(k); return T.length; };
  const tHasBeat = T.some(isBeat);
  if (!tHasBeat) {
    for (let s = 0; s < S.length; s++) {
      if (!isBeat(S[s])) continue;
      // before any matched words → at the top; else before the next matched line and the label/blank lines above it
      let at = 0;
      if ([...pair.keys()].some((k) => k < s)) { at = nextT(s); while (at > 0 && (isSec(T[at - 1]) || !T[at - 1].trim())) at--; }
      const list = ins.get(at) || [];
      if (s > 0 && isSec(S[s - 1]) && !(list.length && list[list.length - 1].text === S[s - 1].trim())) {
        const lab = S[s - 1].trim();
        // the label is only added if the song does not already have it right there
        if (!(at > 0 && T[at - 1] && T[at - 1].trim().toLowerCase() === lab.toLowerCase())) list.push({ text: lab, ch: [] });
      }
      list.push({ text: S[s], ch: sCh.get(s) || [] });
      ins.set(at, list);
    }
  }
  // build the new sheet
  const out = [], ch = [];
  for (let t = 0; t <= T.length; t++) {
    for (const r of ins.get(t) || []) { for (const x of r.ch) ch.push({ l: out.length, ...x }); out.push(r.text); }
    if (t === T.length) break;
    const l = out.length;
    for (const x of got.has(t) ? got.get(t) : tCh.get(t) || []) ch.push({ l, c: x.c, n: x.n });
    out.push(T[t]);
  }
  return { lyrics: out.join('\n'), chords: ch, matched: pair.size, lines: ti.length };
}
