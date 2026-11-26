// Cloudflare Worker: serves the app (static assets) and the import API.
//
//   GET /api/chordtela?url=https://www.chordtela.com/2021/07/....html
//   → 200 { title, artist, key, keyGuessed, capo, lyrics, chords, source, ms }
//   → 400 bad url · 404 no chord sheet on that page · 502 site unreachable
//
// Experimental (v0.1): only Chordtela song pages are accepted, results are cached for a day.

import { isChordtelaSongUrl, parseChordtelaHtml } from '../src/core/chordsheet.js';

const CACHE_SECONDS = 86400;
const UA = 'EvoChord/0.1 (+https://github.com/evolutionofficial/evochord)';

const json = (status, body, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });

export async function importChordtela(pageUrl, { fetchImpl = fetch, cache = null } = {}) {
  if (!isChordtelaSongUrl(pageUrl)) return json(400, { error: 'bad_url' });
  const url = new URL(pageUrl);
  url.hostname = 'www.chordtela.com';
  url.search = '';
  url.hash = '';
  const cacheKey = new Request('https://evochord.cache/chordtela' + url.pathname);
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  const t0 = Date.now();
  let html;
  try {
    const res = await fetchImpl(url.toString(), {
      headers: { 'user-agent': UA, accept: 'text/html' },
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
    });
    if (res.status === 404) return json(404, { error: 'not_found' });
    if (!res.ok) return json(502, { error: 'upstream', status: res.status });
    html = await res.text();
  } catch (e) {
    return json(502, { error: 'unreachable' });
  }
  const song = parseChordtelaHtml(html, url.toString());
  if (!song) return json(404, { error: 'no_chords' });
  const res = json(200, { ...song, ms: Date.now() - t0 }, { 'cache-control': `public, max-age=${CACHE_SECONDS}` });
  if (cache) await cache.put(cacheKey, res.clone());
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/chordtela') {
      if (request.method !== 'GET') return json(405, { error: 'method' });
      const cache = typeof caches !== 'undefined' ? caches.default : null;
      return importChordtela(url.searchParams.get('url') || '', { cache });
    }
    if (url.pathname.startsWith('/api/')) return json(404, { error: 'not_found' });
    return env.ASSETS.fetch(request);
  },
};
