import { describe, it, expect } from 'vitest';
import { toMarks, fromMarks, diffText, editRow, splitRow, joinRows } from '../../src/core/lineedit.js';

const ch = (o) => Object.entries(o).map(([c, n]) => ({ c: +c, n }));
const show = (r) => r.chords.map((x) => x.c + ':' + x.n).join(' ');

describe('highlight markers', () => {
  it('round trip', () => {
    const raw = 'pagi {y:datang} per{r:lahan}';
    const m = toMarks(raw);
    expect(m.text).toBe('pagi datang perlahan');
    expect(m.marks).toEqual([{ s: 5, e: 11, c: 'y' }, { s: 15, e: 20, c: 'r' }]);
    expect(fromMarks(m.text, m.marks)).toBe(raw);
  });
});

describe('diffText', () => {
  it('finds the changed stretch', () => {
    expect(diffText('pagi datang', 'pagi siang')).toEqual({ p: 5, del: 3, ins: 2 });
    expect(diffText('abc', 'abc')).toEqual({ p: 3, del: 0, ins: 0 });
  });
});

describe('editRow', () => {
  //            0123456789012345678901
  const row = 'pagi datang perlahan';
  const chords = ch({ 0: 'C', 6: 'G', 12: 'Am' });

  it('deleting a word deletes its chord and moves the rest', () => {
    const r = editRow(row, 'pagi perlahan', chords);
    expect(r.raw).toBe('pagi perlahan');
    expect(show(r)).toBe('0:C 4:Am'); // "perlahan" starts at 5 → box 4
  });
  it('typing before a chord moves it', () => {
    expect(show(editRow(row, 'oh pagi datang perlahan', chords))).toBe('2:C 8:G 14:Am');
  });
  it('typing after the last chord changes nothing', () => {
    expect(show(editRow(row, 'pagi datang perlahan sekali', chords))).toBe('0:C 6:G 12:Am');
  });
  it('a replaced word keeps its chord', () => {
    expect(show(editRow(row, 'pagi tiba perlahan', chords))).toBe('0:C 4:G 10:Am');
  });
  it('clearing the row clears its chords', () => {
    expect(editRow(row, '', chords).chords).toEqual([]);
  });
  it('chords after the end of the lyrics move with the end', () => {
    expect(show(editRow('aku', 'aku', ch({ 0: 'C', 6: 'G' })))).toBe('0:C 6:G');
    expect(show(editRow('aku', 'kamu', ch({ 0: 'C', 6: 'G' })))).toBe('0:C 6:G');
    expect(show(editRow('aku dan', 'aku', ch({ 0: 'C', 10: 'G' })))).toBe('0:C 6:G');
  });
  it('highlights stay on their letters', () => {
    expect(editRow('pagi {y:datang} perlahan', 'oh pagi datang', []).raw).toBe('oh pagi {y:datang}');
    expect(editRow('pagi {y:datang}', 'pagi da', []).raw).toBe('pagi {y:da}');
  });
});

describe('splitRow', () => {
  it('cuts the row, chords go with their letters', () => {
    const [a, b] = splitRow('pagi datang perlahan', 12, ch({ 0: 'C', 6: 'G', 12: 'Am', 16: 'F' }));
    expect([a.raw, show(a)]).toEqual(['pagi datang', '0:C 6:G']);
    expect([b.raw, show(b)]).toEqual(['perlahan', '0:Am 4:F']);
  });
  it('a cut in the middle of a word', () => {
    const [a, b] = splitRow('pagi datang', 7, ch({ 6: 'G' }));
    expect([a.raw, b.raw, show(a), show(b)]).toEqual(['pagi da', 'tang', '6:G', '']);
  });
});

describe('joinRows', () => {
  it('joins with a space; B\'s chords snap to whole boxes', () => {
    const r = joinRows('pagi', ch({ 0: 'C' }), 'datang', ch({ 0: 'G', 4: 'Am' }));
    expect(r.raw).toBe('pagi datang');
    expect(show(r)).toBe('0:C 4:G 8:Am'); // B starts at 5: its chords snap to whole boxes
    expect(r.at).toBe(4);
  });
  it('joining onto an empty row', () => {
    const r = joinRows('', [], 'datang', ch({ 0: 'G' }));
    expect([r.raw, show(r)]).toEqual(['datang', '0:G']);
  });
});

describe('editRow, several edits at once', () => {
  it('typing at the start and cutting the end', () => {
    const r = editRow('pagi {y:datang} perlahan', 'oh pagi datang', ch({ 0: 'C', 6: 'G', 12: 'Am' }));
    expect(r.raw).toBe('oh pagi {y:datang}');
    expect(show(r)).toBe('2:C 8:G');
  });
});
