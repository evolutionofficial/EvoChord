import { defineConfig } from 'vite';

// The Worker (worker/index.js) serves dist/ and /api/*. In `npm run dev`, /api is proxied
// to a local `wrangler dev` on port 8787 if you run one.
export default defineConfig({
  build: { outDir: 'dist', target: 'es2020' },
  server: { proxy: { '/api': 'http://localhost:8787' } },
});
