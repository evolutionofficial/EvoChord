import { describe, it, expect } from 'vitest';
import { mergeLayer, splitLayer, lyricMask } from '../../src/core/layer.js';

const LYR = '[Verse]\npagi datang perlahan\nsampai pagi tiba\n\n[Chorus]\nkita bernyanyi';
const BEAT = '|• · • · • · • ·|';

describe('chord layer', () => {
  it('merge puts rows before their lyric line and moves chords with their line', () => {
    const m = mergeLayer(LYR, [{ l: 1, c: 0, n: 'C' }, { l: 5, c: 4, n: 'F' }], [
      { at: 0, text: '[Intro]', ch: [] }, { at: 0, text: BEAT, ch: [{ c: 0, n: 'G' }] }, { at: 4, text: BEAT, ch: [{ c: 8, n: 'Am' }] },
    ]);
    expect(m.lyrics.split('\n')).toEqual(['[Intro]', BEAT, '[Verse]', 'pagi datang perlahan', 'sampai pagi tiba', '', BEAT, '[Chorus]', 'kita bernyanyi']);
    expect(m.chords).toEqual([{ l: 1, c: 0, n: 'G' }, { l: 3, c: 0, n: 'C' }, { l: 6, c: 8, n: 'Am' }, { l: 8, c: 4, n: 'F' }]);
    expect(m.lyr).toBe(LYR);
  });
  it('split gives back the lyrics letter for letter, chords on them, and the rows', () => {
    const rows = [{ at: 0, text: '[Intro]', ch: [] }, { at: 0, text: BEAT, ch: [{ c: 0, n: 'G' }] }, { at: 6, text: BEAT, ch: [{ c: 4, n: 'C' }] }];
    const chords = [{ l: 1, c: 0, n: 'C' }, { l: 2, c: 6, n: 'G' }];
    const m = mergeLayer(LYR, chords, rows);
    const s = splitLayer(m.lyrics, m.chords, m.lyr);
    expect(s.lyrics).toBe(LYR);
    expect(s.chords).toEqual(chords);
    expect(s.rows).toEqual(rows);
  });
  it('lines padded with spaces for chords past their end still count as lyrics', () => {
    const m = mergeLayer('satu\ndua', [], []);
    const s = splitLayer('satu      \ndua', [{ l: 0, c: 8, n: 'E' }], m.lyr);
    expect(s).toEqual({ lyrics: 'satu\ndua', chords: [{ l: 0, c: 8, n: 'E' }], rows: [] });
  });
  it('a row added in EvoChords (beat row, section label) never changes the lyrics', () => {
    const sheet = '[Intro]\n' + BEAT + '\n[Verse]\npagi datang perlahan\nsampai pagi tiba\n\n[Chorus]\nkita bernyanyi\n\n[Outro]\n' + BEAT;
    const s = splitLayer(sheet, [{ l: 1, c: 0, n: 'C' }, { l: 10, c: 0, n: 'F' }], LYR);
    expect(s.lyrics).toBe(LYR);
    expect(s.rows.map((r) => [r.at, r.text, r.ch.map((x) => x.n).join(' ')])).toEqual([
      [0, '[Intro]', ''], [0, BEAT, 'C'], [6, '', ''], [6, '[Outro]', ''], [6, BEAT, 'F'],
    ]);
  });
  it('a song with no lyrics is all layer', () => {
    const sheet = '[Intro]\n' + BEAT;
    const s = splitLayer(sheet, [{ l: 1, c: 0, n: 'D' }], '');
    expect(s.lyrics).toBe('');
    expect(s.rows).toEqual([{ at: 0, text: '[Intro]', ch: [] }, { at: 0, text: BEAT, ch: [{ c: 0, n: 'D' }] }]);
    expect(mergeLayer('', [], s.rows).lyrics).toBe(sheet);
  });
  it('lyricMask marks the locked lines', () => {
    expect(lyricMask('[Intro]\n' + BEAT + '\nsatu\ndua', 'satu\ndua')).toEqual([false, false, true, true]);
  });
});

import { importChords } from '../../src/core/layer.js';
import { editRow } from '../../src/core/lineedit.js';

describe('importChords (chords from Chordtela onto the song\'s own lyrics)', () => {
  const mine = '[Verse]\nPagi datang perlahan,\nsampai pagi tiba\n\n[Reff]\nkita bernyanyi lagi';
  const tela = '[Intro]\n|• · • · • · • ·|• · • · • · • ·|\n\n[Verse]\npagi datang perlahan\nsampai pagi tiba\n\n[Chorus]\nkita bernyanyi lagi';
  const tch = [{ l: 1, c: 0, n: 'C' }, { l: 1, c: 16, n: 'G' }, { l: 4, c: 0, n: 'C' }, { l: 4, c: 12, n: 'Am' }, { l: 5, c: 6, n: 'F' }, { l: 8, c: 0, n: 'G' }];
  it('puts the chords on my lines without changing a letter, and adds the intro', () => {
    const r = importChords(mine, [], tela, tch, editRow);
    const lines = r.lyrics.split('\n');
    expect(lines.slice(2)).toEqual(mine.split('\n'));
    expect(lines.slice(0, 2)).toEqual(['[Intro]', '|• · • · • · • ·|• · • · • · • ·|']);
    expect(r.chords.map((x) => `${x.l}:${x.c}:${x.n}`)).toEqual(['1:0:C', '1:16:G', '3:0:C', '3:12:Am', '4:6:F', '7:0:G']);
    expect(r.chords.filter((x) => x.l === 1).length).toBe(2); // the intro's chords came along
    expect([r.matched, r.lines]).toEqual([3, 3]);
  });
  it('a line I wrote differently keeps no chords; the others still get theirs', () => {
    const r = importChords('pagi datang pelan-pelan\nsampai pagi tiba', [], tela, tch, editRow);
    expect(r.chords.filter((x) => x.l >= 2).map((x) => `${x.l}:${x.n}`)).toEqual(['3:F']);
  });
  it('the result splits back to my lyrics exactly', async () => {
    const { splitLayer } = await import('../../src/core/layer.js');
    const r = importChords(mine, [], tela, tch, editRow);
    expect(splitLayer(r.lyrics, r.chords, mine).lyrics).toBe(mine);
  });
});
