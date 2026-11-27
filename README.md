# Evo Chord

Chord dan lirik untuk pemain musik, dari Evolution. Satu keluarga dengan [EvoLyric](https://evolyric.com): tampilan dan cara pakainya sama, Evo Chord menambah chord.

- Semua yang ada di EvoLyric: library & kategori, setlist & antrian, auto-scroll (tap, geser untuk kecepatan, tahan untuk ngebut, cubit untuk ukuran huruf), editor, highlight & catatan, teman, akun & sync cloud, backup, bahasa Indonesia/English
- Chord di atas lirik yang tidak saling tumpuk, transpose sementara atau disimpan
- Editor kotak chord (1 kotak per 2 huruf, sama panjang di semua baris) + baris ketukan untuk intro/interlude
- Cari di Chordtela, tempel link atau teks chord, atau Bagikan dari Android → langsung jadi lagu
- Satu akun dan satu library dengan EvoLyric

## Jalankan

```bash
npm install
npm run build        # src → www
npx wrangler dev     # aplikasi + /api/chordtela di http://localhost:8787
npm test             # tes mesin chord + semua tes end-to-end EvoLyric
```

## Deploy (Cloudflare Workers)

Build command `npm run build`, deploy command `npx wrangler deploy`.

Arsitektur dan aturan "Evo shell": [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
