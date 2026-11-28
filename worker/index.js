// Cloudflare Worker: serves the app (static assets) and the import API.
//
//   GET /api/chordtela?url=https://www.chordtela.com/2021/07/....html
//   → 200 { title, artist, key, keyGuessed, capo, lyrics, chords, source, ms }
//   → 400 bad url · 404 no chord sheet on that page · 502 site unreachable
//
// Experimental (v0.1): only Chordtela song pages are accepted, results are cached for a day.

import { normalizeChordtelaUrl, parseChordtelaHtml, describeHtml } from '../src/core/chordsheet.js';

const CACHE_SECONDS = 86400;
// Bump when the chord-sheet reader changes, so cached imports are read again with the new rules.
export const PARSER_VERSION = 7;
const UA = 'EvoChord/0.1 (+https://github.com/evolutionofficial/evochord)';

const json = (status, body, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });

export async function importChordtela(pageUrl, { fetchImpl = fetch, cache = null } = {}) {
  const canonical = normalizeChordtelaUrl(pageUrl);
  if (!canonical) return json(400, { error: 'bad_url' });
  const url = new URL(canonical);
  const cacheKey = new Request(`https://evochord.cache/v${PARSER_VERSION}/chordtela` + url.pathname);
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
    html = await res.text();
    if (!res.ok) {
      const d = describeHtml(html);
      return json(502, { error: d.challenge ? 'blocked' : 'upstream', status: res.status, debug: d });
    }
  } catch (e) {
    return json(502, { error: 'unreachable' });
  }
  const song = parseChordtelaHtml(html, url.toString());
  if (!song) {
    const d = describeHtml(html);
    return json(d.challenge ? 502 : 404, { error: d.challenge ? 'blocked' : 'no_chords', debug: { ...d, status: 200 } });
  }
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
    // Same as EvoLyric (v168): the asset host redirects /index.html → / and /x.html → /x; older service
    // workers cached that redirect and Safari refuses it. Serve these pages directly, no redirect.
    const p = url.pathname;
    if (/^\/(index|privacy|terms)\.html$/.test(p)) {
      const u = new URL(request.url);
      u.pathname = p === '/index.html' ? '/' : p.slice(0, -5);
      const r = await env.ASSETS.fetch(new Request(u.toString(), { method: request.method, headers: request.headers }));
      if (r.status >= 300 && r.status < 400) return env.ASSETS.fetch(request);
      return new Response(r.body, { status: r.status, headers: r.headers });
    }
    return env.ASSETS.fetch(request);
  },
};
