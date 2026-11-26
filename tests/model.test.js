import { describe, it, expect } from 'vitest';
import { newSong, normalizeSong, songLines, transposeSong, chordsUsed, cellCount, visibleText } from '../src/core/song.js';
import { remapChords } from '../src/core/remap.js';
import { createStore } from '../src/core/store.js';
import { toCloudRow, fromCloudRow } from '../src/core/sync.js';

const song = () =>
  newSong({
    title: 'Contoh',
    key: 'G',
    lyrics: '[Verse]\nhalo dunia\n\n{r:merah} hati',
    chords: [{ l: 1, c: 0, n: 'G' }, { l: 1, c: 6, n: 'D/F#' }, { l: 3, c: 3, n: 'Em' }],
  });

describe('song model', () => {
  it('normalizes chords to even boxes and drops bad items', () => {
    const s = normalizeSong({ lyrics: 'a\nb', chords: [{ l: 0, c: 3, n: 'C' }, { l: 9, c: 0, n: 'G' }, { l: 1, c: 0 }] });
    expect(s.chords).toEqual([{ l: 0, c: 2, n: 'C' }]);
  });
  it('ignores EvoLyric colour markup for positions', () => {
    expect(visibleText('{r:merah} hati')).toBe('merah hati');
    expect(cellCount('{r:merah} hati')).toBe(5);
  });
  it('renders sections, gaps and lyric lines with chords, transposed on the fly', () => {
    const v = songLines(song(), { transpose: 2 });
    expect(v.map((x) => x.type)).toEqual(['section', 'lyric', 'gap', 'lyric']);
    expect(v[1].chords).toEqual([{ c: 0, n: 'A' }, { c: 6, n: 'E/G#' }]);
    expect(v[3].text).toBe('merah hati');
  });
  it('transposes permanently, key included', () => {
    const t = transposeSong(song(), 3);
    expect(t.key).toBe('Bb');
    expect(chordsUsed(t)).toEqual(['Bb', 'F/A', 'Gm']);
  });
});

describe('remapChords', () => {
  it('keeps chords on their line when lines are added above', () => {
    const r = remapChords([{ l: 1, c: 0, n: 'C' }], 'a\nb\nc', 'new\na\nb\nc');
    expect(r).toEqual([{ l: 2, c: 0, n: 'C' }]);
  });
});

describe('store', () => {
  it('saves, lists newest first, removes', () => {
    const st = createStore(null);
    const a = st.put(newSong({ title: 'A' }));
    const b = st.put(newSong({ title: 'B' }));
    expect(st.list()[0].id).toBe(b.id);
    expect(st.findSame('a', '')).toBeTruthy();
    st.remove(a.id);
    expect(st.list().map((s) => s.title)).toEqual(['B']);
  });
});

describe('cloud row (shared with EvoLyric)', () => {
  it('round-trips through the EvoLyric songs row shape', () => {
    const s = song();
    const row = toCloudRow(s, { userId: 'u1', cloudId: 'x1' });
    expect(row).toMatchObject({ id: 'x1', user_id: 'u1', local_id: s.id, title: 'Contoh', lyrics: s.lyrics });
    expect(row.app_data.chords).toHaveLength(3);
    expect(row.app_data.key).toBe('G');
    expect(row.app_data.title).toBeUndefined();
    const back = fromCloudRow(row);
    expect(back.chords).toEqual(s.chords);
    expect(back.id).toBe(s.id);
  });
});
