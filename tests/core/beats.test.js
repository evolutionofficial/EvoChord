import { describe, it, expect } from 'vitest';
import { makeBeatLine, isBeatLine, barCount, readBeatLine, resizeBeatLine, barStartCell } from '../../src/core/beats.js';
import { gridCells, padLyricsForChords, isInstrumentalLine, songLines, normalizeSong } from '../../src/core/song.js';
import { parseChordSheet } from '../../src/core/chordsheet.js';

describe('beat rows', () => {
  it('draws bars of eighths with beats and bar lines', () => {
    expect(makeBeatLine(1)).toBe('|• · • · • · • ·|');
    expect(makeBeatLine(2, '3/4')).toBe('|• · • · • ·|• · • · • ·|');
    expect(makeBeatLine(1, '6/8')).toBe('|• · · • · ·|');
  });
  it('reads and resizes rows', () => {
    const r = makeBeatLine(3, '3/4');
    expect(isBeatLine(r)).toBe(true);
    expect(isInstrumentalLine(r)).toBe(true);
    expect(barCount(r)).toBe(3);
    expect(readBeatLine(r)).toEqual({ bars: 3, timeSig: '3/4' });
    expect(readBeatLine(makeBeatLine(1, '6/8')).timeSig).toBe('6/8');
    expect(resizeBeatLine(r, 1)).toBe(makeBeatLine(4, '3/4'));
    expect(resizeBeatLine(makeBeatLine(1), -1)).toBe(makeBeatLine(1));
    expect(isBeatLine('aku | kamu')).toBe(false);
  });
  it('puts bar starts on chord boxes', () => {
    expect(barStartCell(2)).toBe(16);
    expect(barStartCell(1, '3/4')).toBe(6);
  });
  it('turns imported intro chords into one bar each', () => {
    const r = parseChordSheet('Intro : C G Am F\n\nC    G\nhalo');
    const lines = r.lyrics.split('\n');
    expect(lines[1]).toBe(makeBeatLine(4));
    expect(r.chords.filter((x) => x.l === 1).map((x) => [x.c, x.n])).toEqual([[0, 'C'], [16, 'G'], [32, 'Am'], [48, 'F']]);
    const view = songLines(normalizeSong(r));
    expect(view[1].type).toBe('instrumental');
  });
});

describe('uniform chord grid', () => {
  it('is as wide as the longest row plus 4 spare boxes, at least 16', () => {
    expect(gridCells({ lyrics: 'ab' })).toBe(16);
    expect(gridCells({ lyrics: '[Verse]\n' + 'x'.repeat(40) + '\npendek' })).toBe(24);
    expect(gridCells({ lyrics: 'a', chords: [{ l: 0, c: 40, n: 'C' }] })).toBe(25);
  });
  it('pads lyric lines so chords after the last word exist in the text', () => {
    expect(padLyricsForChords('[Verse]\nhalo\nlagi', [{ l: 1, c: 8, n: 'G' }])).toBe('[Verse]\nhalo     \nlagi');
    expect(padLyricsForChords('halo dunia', [{ l: 0, c: 2, n: 'G' }])).toBe('halo dunia');
  });
});
