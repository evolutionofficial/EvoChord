import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseChordSheet, chordtelaHtmlToText, parseChordtelaHtml, isChordtelaSongUrl, readChordLine } from '../src/core/chordsheet.js';
import { songLines, normalizeSong } from '../src/core/song.js';

const html = readFileSync(new URL('./fixtures/chordtela-sample.html', import.meta.url), 'utf8');
const chordAt = (r, l) => r.chords.filter((x) => x.l === l).map((x) => `${x.c}:${x.n}`);

describe('readChordLine', () => {
  it('finds chords and their columns', () => {
    expect(readChordLine('C       Am   G/B')).toEqual([
      { col: 0, n: 'C' },
      { col: 8, n: 'Am' },
      { col: 13, n: 'G/B' },
    ]);
  });
  it('ignores bars, dots and repeat marks', () => {
    expect(readChordLine('| C | G .. Am  (2x)').map((x) => x.n)).toEqual(['C', 'G', 'Am']);
    expect(readChordLine('Am-F-G').map((x) => x.n)).toEqual(['Am', 'F', 'G']);
    expect(readChordLine('  C -Bm   D-Em').map((x) => [x.col, x.n])).toEqual([[2, 'C'], [5, 'Bm'], [10, 'D'], [12, 'Em']]);
  });
  it('rejects lyric lines', () => {
    expect(readChordLine('Aku cinta Engkau')).toBeNull();
    expect(readChordLine('A B C dimana')).toBeNull();
  });
});

describe('parseChordSheet', () => {
  it('turns chord-over-lyric text into lyrics + chord boxes', () => {
    const r = parseChordSheet('C       Am\naku di sini\nF   G\nmenunggu');
    expect(r.lyrics).toBe('aku di sini\nmenunggu');
    expect(chordAt(r, 0)).toEqual(['0:C', '8:Am']);
    expect(chordAt(r, 1)).toEqual(['0:F', '4:G']);
    expect(r.key).toBe('C');
    expect(r.keyGuessed).toBe(true);
  });
  it('reads "Do = G" and capo', () => {
    const r = parseChordSheet('Do = G\nCapo 3\nG     D\nhalo dunia');
    expect(r.key).toBe('G');
    expect(r.keyGuessed).toBe(false);
    expect(r.capo).toBe(3);
  });
  it('makes sections from labels and keeps instrumental rows', () => {
    const r = parseChordSheet('Intro : C  G  Am\n\nReff:\nF    G\nbernyanyi');
    const lines = r.lyrics.split('\n');
    expect(lines[0]).toBe('[Intro]');
    expect(lines[1]).toBe('|• · • · • · • ·|• · • · • · • ·|• · • · • · • ·|');
    expect(chordAt(r, 1).map((x) => x.split(':')[1])).toEqual(['C', 'G', 'Am']);
    expect(lines).toContain('[Chorus]');
    expect(lines[lines.length - 1]).toBe('bernyanyi');
  });
  it('moves chords left with indented lyrics', () => {
    const r = parseChordSheet('   C     G\n   kita di sini');
    expect(r.lyrics).toBe('kita di sini');
    expect(chordAt(r, 0)).toEqual(['0:C', '6:G']);
  });
  it('pads the line when a chord sits past the last word', () => {
    const r = parseChordSheet('C          G\nhalo');
    expect(chordAt(r, 0)).toEqual(['0:C', '10:G']);
    expect(r.lyrics.length).toBeGreaterThanOrEqual(11);
  });
  it('expands "Back to Reff" with its chords', () => {
    const r = parseChordSheet('Reff:\nC    G\nnyanyi\n\nVerse 2:\nAm\nlagi\n\nBack to Reff');
    const lines = r.lyrics.split('\n');
    expect(lines.filter((l) => l === '[Chorus]')).toHaveLength(2);
    const last = lines.length - 1;
    expect(lines[last]).toBe('nyanyi');
    expect(chordAt(r, last)).toEqual(['0:C', '4:G']);
  });
});

describe('Chordtela page', () => {
  it('extracts the song <pre> with entities decoded', () => {
    const t = chordtelaHtmlToText(html);
    expect(t.startsWith('Evo Band - Lagu Contoh')).toBe(true);
    expect(t).toContain('sampai pagi & malam');
    expect(t).not.toContain('<a');
    expect(t).not.toContain('other unrelated');
  });
  it('parses title, artist, capo, sections, chords and Back to Reff', () => {
    const r = parseChordtelaHtml(html, 'https://www.chordtela.com/2026/01/evo-band-lagu-contoh.html');
    expect(r.artist).toBe('Evo Band');
    expect(r.title).toBe('Lagu Contoh');
    expect(r.capo).toBe(2);
    expect(r.source.site).toBe('chordtela');
    const lines = r.lyrics.split('\n');
    expect(lines[0]).toBe('[Intro]');
    expect(lines.filter((l) => l === '[Chorus]')).toHaveLength(2);
    expect(lines).toContain('kita bernyanyi lagi');
    const l = lines.indexOf('pagi datang perlahan');
    expect(chordAt(r, l)).toEqual(['0:C', '14:Am']);
    // Renders through the shared song model
    const view = songLines(normalizeSong(r));
    expect(view.find((x) => x.type === 'instrumental').chords.map((c) => c.n)).toEqual(['C', 'G/B', 'Am', 'F']);
  });
  it('splits the easy and original versions and drops page scripts', () => {
    const r = parseChordtelaHtml(html, '');
    expect(r.versions.map((v) => v.name)).toEqual(['Chord dasar', 'Versi original']);
    expect(r.lyrics).not.toContain('ORIGINAL');
    expect(r.lyrics).not.toContain('versi chord');
    const o = r.versions[1];
    expect(o.lyrics.trimEnd()).toBe('pagi datang perlahan');
    expect(o.chords.map((x) => x.n)).toEqual(['D', 'Bm', 'A']);
    expect(chordtelaHtmlToText(html)).not.toContain('moc.aletdrohc');
  });
  it('also splits on "===ORIGINAL CHORD===" right after the last lyric', () => {
    const page = '<pre><a class="tbi-tooltip">C</a>\nsatu\n===ORIGINAL CHORD===\n\n<a class="tbi-tooltip">D</a>\nsatu</pre>';
    const r = parseChordtelaHtml(page);
    expect(r.versions.map((v) => [v.name, v.chords[0].n])).toEqual([['Chord dasar', 'C'], ['Versi original', 'D']]);
    expect(r.lyrics).toBe('satu');
  });
  it('takes the title from the page heading when the sheet starts with chords', () => {
    const page = '<h1>Kunci Gitar Grup X - Judul Y Chord Dasar</h1><pre>Capo ♪ fret 3\n\nIntro : <a class="tbi-tooltip">C</a>\n\n<a class="tbi-tooltip">C</a>\nhalo</pre>';
    const r = parseChordtelaHtml(page);
    expect([r.artist, r.title, r.capo]).toEqual(['Grup X', 'Judul Y', 3]);
    expect(r.lyrics.split('\n')[0]).toBe('[Intro]');
  });
  it('accepts only Chordtela song URLs', () => {
    expect(isChordtelaSongUrl('https://www.chordtela.com/2021/07/lyodra-pesan-terakhir.html')).toBe(true);
    expect(isChordtelaSongUrl('https://chordtela.com/2021/07/a-b.html')).toBe(true);
    expect(isChordtelaSongUrl('http://www.chordtela.com/2021/07/a.html')).toBe(true); // upgraded to https
    expect(isChordtelaSongUrl('https://evil.com/2021/07/a.html')).toBe(false);
    expect(isChordtelaSongUrl('https://www.chordtela.com/search?q=x')).toBe(false);
  });
});

describe('robust Chordtela reading', () => {
  it('normalizes link variants', async () => {
    const { normalizeChordtelaUrl } = await import('../src/core/chordsheet.js');
    const c = 'https://www.chordtela.com/2021/07/lyodra-pesan-terakhir.html';
    for (const u of [c, 'http://chordtela.com/2021/07/lyodra-pesan-terakhir.html', 'https://m.chordtela.com/2021/07/Lyodra-Pesan-Terakhir.html?m=1#x', 'https://www.chordtela.com/2021/07/lyodra-pesan-terakhir.html/amp/'])
      expect(normalizeChordtelaUrl(u), u).toBe(c);
    expect(normalizeChordtelaUrl('https://www.chordtela.com/chord-kunci-gitar-dasar-hasil-pencarian?q=x')).toBeNull();
  });
  it('reads pages where the chords are not in a <pre>', () => {
    const page = `<html><title>Kunci Gitar A - B Chord Dasar</title><h1>Kunci Gitar A - B Chord Dasar</h1><nav>Menu Home</nav>
<div class="entry"><p>Intro : <a class="tbi-tooltip">C</a> <a class="tbi-tooltip">G</a></p>
<p><a class="tbi-tooltip">Am</a>&nbsp;&nbsp;&nbsp;&nbsp; <a class="tbi-tooltip">F</a><br>halo semua<br><a class="tbi-tooltip">C</a><br>sampai jumpa</p></div><footer>footer</footer></html>`;
    const r = parseChordtelaHtml(page);
    expect([r.artist, r.title]).toEqual(['A', 'B']);
    expect(r.lyrics).toContain('halo semua');
    expect(r.chords.map((x) => x.n)).toEqual(['C', 'G', 'Am', 'F', 'C']);
  });
  it('reads older pages: div.telabox with <br> lines and &nbsp; spacing', () => {
    const a = (c) => `<a class="tbi-tooltip">${c}<span class="custom tbi-${c}"></span></a>`;
    const page = `<title>Kunci Gitar Grup Lama - Lagu Lama Chord Dasar ©ChordTela.com</title><div class="chordbox"><table><tr><td>${a('Am')}</td></tr></table></div><div class="telabox">
\t\t\tIntro :&nbsp;${a('Am')}...<br />
<br />
&nbsp; &nbsp;&nbsp;${a('Am')}&nbsp; &nbsp; &nbsp;&nbsp;${a('F')}&nbsp; &nbsp;${a('G')}<br />
kita berjalan pelan, di tepi kota<br />
&nbsp;${a('Dm')}<br />
lampu menyala<br />
</div><div class="sidebar">lain</div>`;
    const r = parseChordtelaHtml(page);
    expect([r.artist, r.title]).toEqual(['Grup Lama', 'Lagu Lama']);
    const lines = r.lyrics.split('\n');
    expect(lines).toContain('kita berjalan pelan, di tepi kota');
    const l = lines.indexOf('kita berjalan pelan, di tepi kota');
    expect(r.chords.filter((x) => x.l === l).map((x) => [x.c, x.n])).toEqual([[4, 'Am'], [12, 'F'], [16, 'G']]);
    expect(r.chords.filter((x) => x.l === l + 1).map((x) => x.n)).toEqual(['Dm']);
    expect(r.lyrics).not.toContain('lain');
  });
  it('falls back to another <pre> when the first one has no chord links', () => {
    const page = '<pre>catatan</pre><pre>C     G\nkita di sini</pre>';
    expect(parseChordtelaHtml(page).chords.map((x) => x.n)).toEqual(['C', 'G']);
  });
});

describe('page furniture', () => {
  it('drops everything from "Share" on', () => {
    const r = parseChordSheet('C     G\nlirik terakhir\n\nShare\nChord "X" by Y\nto :\nFacebook\nChord Kunci Gitar Terkait:\nLagu Lain - Judul\nAbout Us · Contact Us\nCopyright © 2013');
    expect(r.lyrics).toBe('lirik terakhir');
  });
});
