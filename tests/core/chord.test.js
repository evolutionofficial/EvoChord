import { describe, it, expect } from 'vitest';
import { parseChord, isChord, transposeChord, transposeKey, prefersFlats, canPress, press, backspace } from '../../src/core/chord.js';

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

import { chordFamily, normKey } from '../../src/core/chord.js';
describe('chordFamily', () => {
  it('major keys: I ii iii IV V vi vii° and V/7', () => {
    expect(chordFamily('C')).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 'G/B']);
    expect(chordFamily('G')).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim', 'D/F#']);
    expect(chordFamily('Bb')).toEqual(['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'Adim', 'F/A']);
  });
  it('minor keys: i ii° III iv v VI VII and V', () => {
    expect(chordFamily('Am')).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G', 'E']);
    expect(chordFamily('Dm')).toEqual(['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C', 'A']);
  });
  it('no key, no family', () => { expect(chordFamily('')).toEqual([]); expect(chordFamily('xyz')).toEqual([]); });
});

describe('normKey', () => {
  it('editor pairs become one spelling', () => {
    expect(normKey('C#/Db')).toBe('Db'); expect(normKey('F#/Gb')).toBe('F#'); expect(normKey('A#/Bb')).toBe('Bb');
    expect(normKey('G')).toBe('G'); expect(normKey('G/B')).toBe('G/B'); expect(normKey('')).toBe('');
  });
  it('family of an editor pair', () => { expect(chordFamily('A#/Bb')[0]).toBe('Bb'); });
});

import { parseChord as pc, transposeChord as tc } from '../../src/core/chord.js';
describe('extensions and altered chords', () => {
  it('parse and transpose', () => {
    for (const [a, b] of [['C9', 'D9'], ['C11', 'D11'], ['C13', 'D13'], ['C7b9', 'D7b9'], ['C7#9', 'D7#9'], ['C7#11', 'D7#11'], ['C7b13', 'D7b13'],
      ['C7#5', 'D7#5'], ['Cm7b5', 'Dm7b5'], ['Cmaj7#11', 'Dmaj7#11'], ['C7alt', 'D7alt'], ['C6/9', 'D6/9'], ['C7(b9)', 'D7(b9)'], ['Em(add9)', 'F#m(add9)'],
      ['C13/E', 'D13/F#'], ['C9sus4', 'D9sus4'], ['C5', 'D5']]) {
      expect(pc(a), a).not.toBeNull();
      expect(tc(a, 2)).toBe(b);
    }
  });
  it('still not a chord', () => { for (const x of ['Cx', 'H7', 'C/9', 'Calt7b']) expect(pc(x), x).toBeNull(); });
});

import { toNashville } from '../../src/core/chord.js';
describe('Nashville numbers', () => {
  it('major key', () => {
    expect(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 'G/B', 'Bb', 'G7', 'Fmaj7', 'Dsus4', 'E7', 'Ab'].map((c) => toNashville(c, 'C')))
      .toEqual(['1', '2m', '3m', '4', '5', '6m', '7dim', '5/7', 'b7', '57', '4maj7', '2sus4', '37', 'b6']);
  });
  it('other keys and spellings', () => {
    expect(['D', 'F#m', 'D/F#', 'A7', 'C#m7b5'].map((c) => toNashville(c, 'D'))).toEqual(['1', '3m', '1/3', '57', '7m7b5']);
    expect(['Bb', 'Eb', 'F/A', 'Gm'].map((c) => toNashville(c, 'A#/Bb'))).toEqual(['1', '4', '5/7', '6m']);
  });
  it('minor key counts from its tonic', () => {
    expect(['Am', 'C', 'Dm', 'E', 'F', 'G'].map((c) => toNashville(c, 'Am'))).toEqual(['1m', 'b3', '4m', '5', 'b6', 'b7']);
  });
  it('no key: unchanged', () => expect(toNashville('G', '')).toBe('G'));
});
