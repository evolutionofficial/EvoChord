# Evo Chord

Chord dan lirik untuk pemain musik, dari Evolution. Saudara [EvoLyric](https://evolyric.com): EvoLyric untuk vokalis, Evo Chord untuk gitar, keyboard, dan bass.

- Chord di atas lirik yang tidak saling tumpuk, ikut rapi saat baris terlipat
- Transpose naik/turun (sementara atau disimpan), capo, ukuran huruf, auto-scroll
- Editor chord: 1 kotak per 2 karakter + keyboard chord khusus
- Impor dari link Chordtela (eksperimen) atau tempel teks chord, termasuk pilihan versi chord dasar / original
- Data lagu memakai format yang sama dengan EvoLyric, siap disambungkan lewat satu akun Evo

## Jalankan

```bash
npm install
npm run dev        # aplikasi di http://localhost:5173 (impor link butuh `npx wrangler dev` di port 8787)
npm test           # Vitest
npm run build      # hasil di dist/
```

## Deploy (Cloudflare Workers)

```bash
npm run deploy     # vite build + wrangler deploy
```

Atau sambungkan repo ini di Cloudflare → Workers & Pages → Create → Import a repository, dengan build command `npm run build` dan deploy command `npx wrangler deploy`.

## Dokumentasi

Struktur modul, model data bersama EvoLyric, dan rencana sambungan: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
