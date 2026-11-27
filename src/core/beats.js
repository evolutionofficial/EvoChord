// Beat rows for intros, interludes and other parts without lyrics.
//
// A beat row is an ordinary lyric line made of 2-character cells, one cell per eighth note,
// so a chord box (also 2 characters) sits on an exact eighth:
//   first char: "|" at the start of a bar, otherwise a space
//   second char: "•" on a beat, "·" on the "and"
// The row ends with a closing "|". One bar of 4/4:  "|• · • · • · • ·|"
// It is plain text, so EvoLyric shows the same dots and bar lines under its chords.

export const TIME_SIGS = ['4/4', '3/4', '6/8', '2/4'];

/** Cells (eighths) per bar and which cells are beats. */
export function barShape(timeSig = '4/4') {
  switch (timeSig) {
    case '3/4':
      return { cells: 6, beats: [0, 2, 4] };
    case '2/4':
      return { cells: 4, beats: [0, 2] };
    case '6/8':
      return { cells: 6, beats: [0, 3] };
    default:
      return { cells: 8, beats: [0, 2, 4, 6] };
  }
}

/** A beat row of `bars` bars. */
export function makeBeatLine(bars = 1, timeSig = '4/4') {
  const { cells, beats } = barShape(timeSig);
  let s = '';
  for (let b = 0; b < Math.max(1, bars); b++)
    for (let i = 0; i < cells; i++) s += (i === 0 ? '|' : ' ') + (beats.includes(i) ? '•' : '·');
  return s + '|';
}

export const isBeatLine = (line) => /^[|•·\s]+$/.test(line ?? '') && /[•·]/.test(line ?? '') && /\|/.test(line ?? '');

/** Number of bars in a beat row. */
export const barCount = (line) => Math.max(0, (String(line ?? '').match(/\|/g) || []).length - 1);

/** Bars in a beat row, and the time signature that fits its first bar. */
export function readBeatLine(line) {
  const s = String(line ?? '');
  const firstBar = s.indexOf('|', 1);
  const cells = firstBar > 0 ? firstBar / 2 : 0;
  const beats = [];
  for (let i = 0; i < cells; i++) if (s[i * 2 + 1] === '•') beats.push(i);
  const timeSig = cells === 6 ? (beats.length === 2 ? '6/8' : '3/4') : cells === 4 ? '2/4' : '4/4';
  return { bars: barCount(s), timeSig };
}

/** Beat row with one bar more or less (at least one bar). */
export function resizeBeatLine(line, delta) {
  const { bars, timeSig } = readBeatLine(line);
  return makeBeatLine(Math.max(1, bars + delta), timeSig);
}

/** Chord-box index of the start of bar `bar` (0-based). */
export function barStartCell(bar, timeSig = '4/4') {
  return bar * barShape(timeSig).cells;
}

/**
 * Short form of a beat row with its chords, the way chord sites write it: "C . C/E . | F . . . |".
 * One token per beat (a chord or "."); a chord on an "and" is added after its beat.
 * @param {string} line beat row
 * @param {(c:number)=>string|undefined} chordAt chord name at a character offset (cells start at even offsets)
 * @returns {{t:string, chord:boolean}[][]} tokens per bar
 */
export function compactBeatRow(line, chordAt) {
  const s = String(line ?? '');
  const { timeSig } = readBeatLine(s);
  const { cells } = barShape(timeSig);
  const out = [];
  for (let start = 0; start < s.length - 1; start += cells * 2) {
    const bar = [];
    for (let i = 0; i < cells; i++) {
      const c = start + i * 2;
      if (c >= s.length - 1) break;
      const n = chordAt(c);
      if (n) bar.push({ t: n, chord: true });
      else if (s[c + 1] === '•') bar.push({ t: '.', chord: false });
    }
    if (bar.length) out.push(bar);
  }
  return out;
}
