import { describe, it, expect } from 'vitest';
import { parseChord, isChord, transposeChord, transposeKey, prefersFlats, canPress, press, backspace } from '../src/core/chord.js';

describe('parseChord', () => {
  it('reads root, accidental, quality and bass', () => {
    expect(parseChord('C#m7/G#')).toEqual({ root: 'C', acc: '#', quality: 'm7', bass: 'G#' });
    expect(parseChord('Bbmaj7')).toEqual({ root: 'B', acc: 'b', quality: 'maj7', bass: null });
    expect(parseChord('Amin')).toEqual({ root: 'A', acc: '', quality: 'm', bass: null });
  });
  it('accepts common spellings and rejects words', () => {
    for (const c of ['C', 'Am', 'G7', 'Dsus4', 'Cadd9', 'F#m7b5', 'Cdim', 'Caug', 'C+', 'G/B', 'Esus2', 'A7sus4'])
      expect(isChord(c), c).toBe(true);
    for (const w of ['Cinta', 'Aku', 'Back', 'H', 'cm', '', 'Am7x'])
      expect(isChord(w), w).toBe(false);
  });
});

describe('transpose', () => {
  it('moves root and bass', () => {
    expect(transposeChord('C', 2)).toBe('D');
    expect(transposeChord('Am7/G', 3)).toBe('Cm7/A#');
    expect(transposeChord('B', 1)).toBe('C');
    expect(transposeChord('C', -1)).toBe('B');
  });
  it('can spell with flats', () => {
    expect(transposeChord('C', 3, { flats: true })).toBe('Eb');
    expect(transposeChord('Bb', 2)).toBe('C');
    expect(transposeChord('Bb', 1)).toBe('B');
  });
  it('keeps unknown text', () => {
    expect(transposeChord('N.C.', 2)).toBe('N.C.');
  });
  it('transposes keys using the usual spelling', () => {
    expect(transposeKey('G', 3)).toBe('Bb');
    expect(transposeKey('C', 2)).toBe('D');
    expect(transposeKey('Em', 1)).toBe('Fm');
    expect(prefersFlats('F')).toBe(true);
    expect(prefersFlats('E')).toBe(false);
  });
});

describe('chord keyboard', () => {
  it('builds chords token by token', () => {
    let b = '';
    for (const k of ['C', '#', 'm', '7']) b = press(b, k);
    expect(b).toBe('C#m7');
    expect(canPress(b, 'm')).toBe(false);
    expect(canPress('', '#')).toBe(false);
    b = press('G', '/');
    b = press(b, 'B');
    expect(b).toBe('G/B');
    expect(press('Am', 'D')).toBe('D');
  });
  it('backspace removes whole tokens', () => {
    expect(backspace('Cmaj7')).toBe('C');
    expect(backspace('G/B')).toBe('G/');
    expect(backspace('C')).toBe('');
  });
});
