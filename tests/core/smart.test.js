import { describe, it, expect } from 'vitest';
import * as S from '../../src/core/smart.js';
import { transposeTo } from '../../src/core/chord.js';
import { mergeLayer, splitLayer } from '../../src/core/layer.js';

// line:            0           1                2                  3   4          5                 6
const SHEET = ['[Verse 1]', 'pagi datang', 'sampai pagi tiba', '', '[Chorus]', 'kita bernyanyi', 'lagi dan lagi',
  //  7      8           9               10   11         12               13              14  15          16
  '', '[Verse 2]', 'malam datang', 'bulan bersinar', '', '[Reff]', 'kita bernyanyi', 'lagi dan lagi', '', '[Verse 3]', 'satu baris saja'];
const show = (ch) => ch.map((x) => `${x.l}:${x.c}:${x.n}${x.o ? '*' : ''}`).join(' ');

describe('sections', () => {
  it('kinds', () => {
    expect(['Verse 2', 'Reff', 'Chorus x2', 'Pre-Reff', 'BAIT II', 'Interlude', 'Musik'].map(S.sectionType)).toEqual(['verse', 'chorus', 'chorus', 'pre-chorus', 'verse', 'interlude', 'interlude']);
  });
  it('twins match by row number; a shorter verse has no partner for the extra row', () => {
    expect(S.twinLines(SHEET, 1)).toEqual([9, 17]);
    expect(S.twinLines(SHEET, 2)).toEqual([10]);
    expect(S.twinLines(SHEET, 5)).toEqual([13]);
  });
});

describe('setChord', () => {
  it('linked: one Chorus edit goes to every Chorus (Reff counts)', () => {
    expect(show(S.setChord(SHEET, [], 5, 0, 'G', { linked: true }))).toBe('5:0:G 13:0:G');
  });
  it('not linked: the chord is marked different and later linked edits leave it alone', () => {
    let ch = S.setChord(SHEET, [], 1, 0, 'C', { linked: true }); // Verse 1, 2, 3
    ch = S.setChord(SHEET, ch, 17, 0, 'Am'); // Verse 3 on its own
    expect(show(ch)).toBe('1:0:C 9:0:C 17:0:Am*');
    ch = S.setChord(SHEET, ch, 1, 0, 'D', { linked: true });
    expect(show(ch)).toBe('1:0:D 9:0:D 17:0:Am*');
    // other chords of Verse 3 still follow
    ch = S.setChord(SHEET, ch, 1, 6, 'G', { linked: true });
    expect(show(ch)).toBe('1:0:D 1:6:G 9:0:D 9:6:G 17:0:Am* 17:6:G');
  });
  it('deleting linked', () => {
    let ch = S.setChord(SHEET, [], 5, 0, 'G', { linked: true });
    ch = S.setChord(SHEET, ch, 13, 0, '', { linked: true });
    expect(ch).toEqual([]);
  });
  it('follow again takes the twins\' value', () => {
    let ch = S.setChord(SHEET, [], 1, 0, 'C', { linked: true });
    ch = S.setChord(SHEET, ch, 17, 0, 'Am');
    expect(show(S.followAgain(SHEET, ch, 17, 0))).toBe('1:0:C 9:0:C 17:0:C');
  });
});

describe('move', () => {
  const base = [{ l: 1, c: 0, n: 'D/F#' }, { l: 1, c: 6, n: 'C#m7b5' }];
  it('one box at a time, name unchanged, stops in front of another chord', () => {
    let r = S.moveChord(SHEET, base, 1, 0, 1);
    expect([show(r.chords), r.c]).toEqual(['1:2:D/F#* 1:6:C#m7b5', 2]);
    r = S.moveChord(SHEET, r.chords, 1, 2, 1);
    r = S.moveChord(SHEET, r.chords, 1, 4, 1); // blocked by C#m7b5 at 6
    expect([show(r.chords), r.c]).toEqual(['1:4:D/F#* 1:6:C#m7b5', 4]);
    expect(S.moveChord(SHEET, base, 1, 0, -1).c).toBe(0); // edge
  });
  it('linked moves follow in twins', () => {
    const ch = S.setChord(SHEET, [], 5, 0, 'G', { linked: true });
    expect(show(S.moveChord(SHEET, ch, 5, 0, 1, { linked: true }).chords)).toBe('5:2:G 13:2:G');
  });
  it('a whole row', () => {
    expect(show(S.moveRow(SHEET, base, 1, 1, { linked: false, maxC: 10 }))).toBe('1:2:D/F#* 1:8:C#m7b5*');
    expect(show(S.moveRow(SHEET, base, 1, 1, { maxC: 8 }))).toBe('1:0:D/F# 1:6:C#m7b5'); // at the edge: nothing moves
  });
});

describe('pattern, replace all', () => {
  it('fills the section rows, repeating the pattern', () => {
    expect(show(S.fillPattern(SHEET, [], 5, ['G', 'D', 'Em', 'C'], { perRow: 2 }))).toBe('5:0:G 5:6:D 6:0:Em 6:6:C');
  });
  it('replace all', () => {
    expect(show(S.replaceAll([{ l: 1, c: 0, n: 'D' }, { l: 2, c: 0, n: 'D', o: 1 }, { l: 2, c: 4, n: 'G' }], 'D', 'D/F#'))).toBe('1:0:D/F# 2:0:D/F#* 2:4:G');
  });
});

describe('transpose', () => {
  it('one function; slash, alterations and spelling of the target key', () => {
    expect(transposeTo('D/F#', 2, 'E')).toBe('E/G#');
    expect(transposeTo('C#m7b5', 2, 'E')).toBe('D#m7b5');
    expect(transposeTo('A#', 0, 'F')).toBe('A#');
    expect(transposeTo('C', 5, 'F')).toBe('F');
    expect(transposeTo('G', 3, 'Bb')).toBe('Bb');
    expect(transposeTo('A', 5, 'D')).toBe('D');
    expect(transposeTo('A#', 12, 'C')).toBe('A#');
  });
  it('whole song changes every chord and the key; a section with linking skips marked twins', () => {
    let ch = S.setChord(SHEET, [], 1, 0, 'D/F#', { linked: true });
    ch = S.setChord(SHEET, ch, 17, 0, 'C#m7b5');
    const all = S.transposeChords(SHEET, ch, 2, { key: 'D' });
    expect([show(all.chords), all.key]).toEqual(['1:0:E/G# 9:0:E/G# 17:0:D#m7b5*', 'E']);
    const sec = S.transposeChords(SHEET, ch, 2, { key: 'D', line: 1, linked: true });
    expect([show(sec.chords), sec.key]).toEqual(['1:0:E/G# 9:0:E/G# 17:0:C#m7b5*', 'D']);
  });
  it('up and back down gives the same chords', () => {
    const ch = [{ l: 1, c: 0, n: 'Bb' }, { l: 1, c: 4, n: 'F/A' }];
    const up = S.transposeChords(SHEET, ch, 2, { key: 'F' });
    expect(S.transposeChords(SHEET, up.chords, -2, { key: up.key }).chords).toEqual(ch);
  });
});

describe('variants', () => {
  it('D', () => expect(S.variants('D', 'G').slice(0, 14)).toEqual(['D', 'Dm', 'D7', 'Dmaj7', 'Dm7', 'Dsus2', 'Dsus4', 'Dadd9', 'D6', 'D9', 'Ddim', 'Daug', 'D/F#', 'D/A']));
  it('Em in a flat key', () => expect(S.variants('Em', 'F')).toContain('Em/G'));
});

describe('marks survive the database layer', () => {
  it('o goes up and comes back', () => {
    const m = mergeLayer('satu\ndua', [{ l: 0, c: 0, n: 'C', o: 1 }], [{ at: 1, text: '|• · • · • · • ·|', ch: [{ c: 0, n: 'G', o: 1 }] }]);
    const s = splitLayer(m.lyrics, m.chords, m.lyr);
    expect(s.chords).toEqual([{ l: 0, c: 0, n: 'C', o: 1 }]);
    expect(s.rows[0].ch).toEqual([{ c: 0, n: 'G', o: 1 }]);
  });
});
