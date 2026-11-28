/* EvoChords: "Search online" looks for chords on Chordtela (through Google) instead of LRCLIB lyrics.
   Same flow and screens as EvoLyric's Web Lyric: Google → come back → one tap → temporary song → Save to Library. */
const path = require('path'), fs = require('fs');
const FIX = path.join(__dirname, '../core/fixtures/chordtela-sample.html');
const LINK = 'https://www.chordtela.com/2026/01/evo-band-lagu-contoh.html';
let API = null;
const api = async () => {
  if (!API) {
    const { parseChordtelaHtml } = await import(path.join(__dirname, '../../src/core/chordsheet.js'));
    API = { ...parseChordtelaHtml(fs.readFileSync(FIX, 'utf8'), LINK), ms: 12 };
  }
  return API;
};
const route = async (t, fn) => {
  const hits = [];
  await t.ctx.route('**/api/chordtela**', async (r) => {
    hits.push(decodeURIComponent(r.request().url()));
    return fn(r);
  });
  return hits;
};
const ok = async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(await api()) });
const pages = (t) => { const a = []; t.ctx.on('page', (pg) => a.push(pg)); return a; };
const vis = (p, hidden) => p.evaluate((h) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
  document.dispatchEvent(new Event('visibilitychange'));
}, hidden);
const sheet = (p) => p.evaluate(() => ($('#ctx').classList.contains('on') ? [...$('#csheet').children].map((e) => e.textContent) : null));

module.exports = ({ test, assert, eq, open }) => {
  test('Chord search: no match in the Library → Search online opens Google for Chordtela; coming back, Get chords reads the copied link and opens a temporary song with chords', async () => {
    const t = await open(), p = t.page; const pg = pages(t); const hits = await route(t, ok);
    await t.ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await t.ctx.route('https://www.google.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: 'google' }));
    await p.fill('#q', 'lagu contoh'); await p.waitForTimeout(700); await p.click('#items .ewb'); await p.waitForTimeout(600);
    eq(pg.length, 1, 'Google opened');
    assert(pg[0].url().includes('google.com/search?q=lagu%20contoh%20chord%20site%3Achordtela.com'), 'query: ' + pg[0].url());
    await vis(p, true);
    await p.evaluate((l) => navigator.clipboard.writeText('Lihat ini ' + l), LINK.replace('https://www.', 'm.'));
    await vis(p, false); await p.bringToFront(); await p.waitForTimeout(500);
    const sh = await sheet(p); eq([sh[0], sh[2], sh[3]], ['Copied the link?', 'Get chords', 'Back'], 'return question');
    await p.click('#csheet .wlok'); await p.waitForTimeout(800);
    eq(hits.length, 1, 'asked the EvoChords server once'); assert(hits[0].includes('url=' + LINK), 'normalised link: ' + hits[0]);
    const r = await p.evaluate(() => [$('#play').classList.contains('on'), isTemp(cur), cur.title, cur.artist, cur.src, cur.capo, cur.chords.length > 5, songs.length]);
    eq(r, [true, true, 'Lagu Contoh', 'Evo Band', 'chordtela', 0, false, 5], 'temporary chord song, library untouched');
    eq(await p.evaluate(() => [cur.srcId, cur.chords.map((c) => c.n).join(' ')]), [1, 'D Bm A'], 'the original version opens first');
    eq(await p.evaluate(() => document.querySelectorAll('#txt .chd').length), 3, 'chords drawn');
    eq(t.errors, [], 'no page errors'); await t.close();
  });

  test('Chord search: two versions on the page → the versions button lists Chord dasar / Versi original; Save to Library keeps chords, key and capo', async () => {
    const t = await open(), p = t.page; await route(t, ok);
    await t.ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
    await p.evaluate((l) => navigator.clipboard.writeText(l), LINK);
    await p.evaluate(() => chordIn('', 'x')); await p.evaluate(async () => { await chordIn(await navigator.clipboard.readText(), 'x'); }); await p.waitForTimeout(800);
    eq(await p.evaluate(() => [getComputedStyle($('#vsb')).display, $('#vsbv').textContent]), ['flex', '2'], 'versions button shows 2');
    await p.click('#vsb'); await p.waitForTimeout(250);
    eq(await p.evaluate(() => [...document.querySelectorAll('#vsl .wlv b')].map((b) => b.textContent)), ['Chord dasar', 'Versi original'], 'version names');
    eq(await p.evaluate(() => document.querySelector('#vsl .wlv[aria-current]').textContent.includes('Versi original')), true, 'original is the current one');
    await p.click('#vsl .wlv >> nth=0'); await p.waitForTimeout(500);
    eq(await p.evaluate(() => [isTemp(cur), cur.chords[0].n, cur.capo]), [true, 'C', 2], 'easy version shown, still temporary');
    await p.click('#vsb'); await p.waitForTimeout(250); await p.click('#vsl .wlv >> nth=1'); await p.waitForTimeout(500);
    eq(await p.evaluate(() => [isTemp(cur), cur.chords.map((c) => c.n).join(' ')]), [true, 'D Bm A'], 'original version again, still temporary');
    await p.evaluate(() => saveTemp(true)); await p.waitForTimeout(200);
    const s = await p.evaluate(() => { const x = songs[songs.length - 1]; return [isTemp(cur), x.title, x.chords.length, x.capo, !!x.key, songs.length]; });
    eq(s, [false, 'Lagu Contoh', 3, 0, true, 6], 'saved with its chords');
    eq(t.errors, [], 'no page errors'); await t.close();
  });

  test('Chord search: copied chord text (no link) opens as a temporary song with chords, read on the device', async () => {
    const t = await open(), p = t.page; const hits = await route(t, ok);
    await p.evaluate(() => chordIn('Intro : C G\n\nC        Am\nkita bernyanyi\nF    G\nsampai pagi', 'Judul'));
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => [isTemp(cur), cur.src, cur.title, cur.lyrics.split('\n')[1].startsWith('|•'), cur.chords.map((c) => c.n).join(' ')]);
    eq(r, [true, 'paste', 'Judul', true, 'C G C Am F G'], 'chords read from the text; intro becomes a beat row');
    eq(hits.length, 0, 'no server call'); await t.close();
  });

  test('Chord search: offline or an unreadable page says so and stays put', async () => {
    const t = await open(), p = t.page;
    await route(t, (r) => r.abort('internetdisconnected'));
    await p.evaluate((l) => chordIn(l, 'x'), LINK); await p.waitForTimeout(500);
    eq(await p.evaluate(() => [$('#list').classList.contains('on'), !!cur && isTemp(cur)]), [true, false], 'stays on Home');
    await t.ctx.unroute('**/api/chordtela**');
    await route(t, (r) => r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no_chords"}' }));
    await p.evaluate((l) => chordIn(l, 'x'), LINK); await p.waitForTimeout(500);
    eq(await p.evaluate(() => $('#list').classList.contains('on')), true, 'still Home');
    eq(t.errors, [], 'no page errors'); await t.close();
  });

  test('Chord search: Share / Paste as new song with a Chordtela link imports the chords', async () => {
    const t = await open(), p = t.page; await route(t, ok);
    await p.evaluate((l) => textIn('Coba lagu ini ' + l, []), LINK); await p.waitForTimeout(800);
    eq(await p.evaluate(() => [isTemp(cur), cur.title, cur.chords.length]), [true, 'Lagu Contoh', 3], 'opened with chords');
    await t.close();
  });
  test('Chord search: intro beat rows show the short form, one token per beat ("C . . . | G/B . . . |"), and follow the key', async () => {
    const t = await open(), p = t.page; await route(t, ok);
    await p.evaluate((l) => chordIn(l, 'x'), LINK); await p.waitForTimeout(800);
    await p.click('#vsb'); await p.waitForTimeout(250); await p.click('#vsl .wlv >> nth=0'); await p.waitForTimeout(500); // the intro is in the easy version
    const row = () => p.evaluate(() => { const v = document.querySelector('#txt .ln.bshort .bview'); return v ? [...v.querySelectorAll('.bbar')].map((b) => [...b.children].map((x) => x.dataset.t).join(' ')) : null; });
    eq((await row())[0], 'C . . . |', 'first bar');
    eq(await p.evaluate(() => { const d = document.querySelector('#txt .ln.bshort'); return [EvoCore.beats.isBeatLine(d.textContent), getComputedStyle(d.querySelector('.braw')).display]; }), [true, 'none'], 'the dot row stays in the text, hidden');
    await p.evaluate(() => tpSet(2)); await p.waitForTimeout(300);
    eq((await row())[0], 'D . . . |', 'transposed');
    eq(t.errors, [], 'no page errors'); await t.close();
  });
};
