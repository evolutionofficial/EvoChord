import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { importChordtela } from '../worker/index.js';

const html = readFileSync(new URL('./fixtures/chordtela-sample.html', import.meta.url), 'utf8');
const okFetch = async () => new Response(html, { status: 200 });

describe('/api/chordtela', () => {
  it('rejects other sites without fetching', async () => {
    let called = false;
    const r = await importChordtela('https://example.com/2021/07/a.html', { fetchImpl: async () => ((called = true), new Response('')) });
    expect(r.status).toBe(400);
    expect(called).toBe(false);
  });
  it('returns the parsed song', async () => {
    const r = await importChordtela('https://chordtela.com/2026/01/evo-band-lagu-contoh.html?x=1', { fetchImpl: okFetch });
    expect(r.status).toBe(200);
    const j = await r.json();
    expect(j.title).toBe('Lagu Contoh');
    expect(j.source.url).toBe('https://www.chordtela.com/2026/01/evo-band-lagu-contoh.html');
    expect(j.chords.length).toBeGreaterThan(10);
  });
  it('maps upstream failures', async () => {
    expect((await importChordtela('https://www.chordtela.com/2026/01/x.html', { fetchImpl: async () => new Response('', { status: 404 }) })).status).toBe(404);
    expect((await importChordtela('https://www.chordtela.com/2026/01/x.html', { fetchImpl: async () => new Response('', { status: 503 }) })).status).toBe(502);
    expect((await importChordtela('https://www.chordtela.com/2026/01/x.html', { fetchImpl: async () => { throw new Error('x'); } })).status).toBe(502);
    expect((await importChordtela('https://www.chordtela.com/2026/01/x.html', { fetchImpl: async () => new Response('<html>no pre</html>') })).status).toBe(404);
  });
});
