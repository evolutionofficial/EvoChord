# EvoChords – Arsitektur ("Evo shell")

EvoChords memakai **seluruh UI/UX EvoLyric** – Home/library, layar lirik dengan auto-scroll, editor, setlist & antrian, kategori, teman, highlight & catatan, akun + sync cloud, backup, preferensi, bahasa EN/ID, tour, halaman legal – lalu menambah yang khas pemain musik: chord yang tidak saling tumpuk, transpose, editor kotak chord dengan baris ketukan, dan impor dari Chordtela.

Tujuannya satu cara pakai untuk semua produk Evo (EvoLyric, EvoChords, EvoBeat): siapa pun yang bisa memakai satu aplikasi langsung bisa memakai yang lain.

## Struktur

```
src/
  index.html            markup semua layar (dari EvoLyric); CSS disuntik saat build
  styles/
    01–13-*.css         CSS EvoLyric, dipecah per area (urutan = urutan asli)
    50+-*.css           tampilan khas EvoChords
  app/
    01–17-*.js          kode EvoLyric, dipecah per fitur (urutan = urutan asli):
                        core, library, weblyric, import, prefs-i18n, settings-help, tour,
                        account-backup, play, scroll-menu, queue-gestures, editor,
                        notes-chords, auth-profile, friends, sync, welcome-init
    50+-chord-*.js      perubahan khas EvoChords (lihat di bawah)
  core/                 mesin chord murni (ES modules, dites dengan Vitest):
                        chord.js, song.js, beats.js, chordsheet.js, remap.js
tools/build.mjs         src → www (lihat "Build")
www/                    situs statis yang di-deploy (seperti EvoLyric)
worker/index.js         Cloudflare Worker: aset + /api/chordtela
tests/core/             Vitest untuk src/core + worker
tests/e2e/              tes end-to-end EvoLyric (Playwright) – semuanya harus tetap lulus
```

### Build

`node tools/build.mjs`:
- `src/styles/*.css` digabung berurutan dan disuntik ke `<style>` di `www/index.html` (fitur nada warna EvoLyric membaca stylesheet itu).
- `src/app/*.js` digabung berurutan menjadi **satu** skrip `www/app.js`. Karena satu skrip, perilakunya identik dengan EvoLyric yang satu file.
- `src/core/index.js` dibundel menjadi `www/js/evocore.js` (`window.EvoCore`).

### Aturan "ganti yang perlu diganti"

File `01–17` adalah EvoLyric dan dibiarkan sedekat mungkin dengan aslinya, supaya pembaruan EvoLyric mudah dibawa ke sini. Perubahan EvoChords ada di file `50+`:

- Fungsi yang dideklarasikan ulang di file `50+` dengan nama yang sama **menggantikan** fungsi EvoLyric di mana pun (aturan JavaScript untuk deklarasi fungsi dalam satu skrip).
- `const`/`let` tidak boleh dideklarasikan ulang – helper baru memakai nama baru.
- Untuk EvoBeat: salin repo ini, ganti `50-chord-*` dengan `50-beat-*`.

| File | Isi |
|---|---|
| `50-chord-render.js` | `chordApply` versi EvoChords: nama chord ditranspose sementara, label tidak bertumpuk (teks di bawahnya bergeser), baris ketukan bergaya sendiri |
| `51-chord-transpose.js` | tombol Nada di pojok (gaya sama dengan tombol Speed): naik/turun, reset, simpan nada |
| `52-chord-editor.js` | editor chord: kotak seragam di semua baris, baris ketukan (+ Ketukan, birama, tambah/kurangi/hapus), tombol chord di toolbar editor |
| `53-chord-web.js` | "Cari online" → Google khusus Chordtela → kembali → Ambil chord (link atau teks chord) → lagu sementara + Simpan ke Library + tombol Versi (chord dasar / original); tempel & bagikan memakai pembaca yang sama |

## Data lagu (sama dengan EvoLyric)

```js
{ id, title, artist, lyrics, key, capo, speed, font, colors, ann, stops,
  chords: [{ l, c, n }],   // l = index baris lirik, c = index karakter genap (1 kotak = 2 karakter)
  src: { site: 'chordtela', url } }  // opsional
```

- Baris ketukan adalah baris lirik biasa: `|• · • · • · • ·|` (1 kotak = ⅛ ketuk, `|` birama, `•` ketukan, `·` and), jadi EvoLyric juga menampilkannya.
- Chord setelah kata terakhir: baris lirik diberi spasi sampai posisi chord, agar posisinya sama di kedua aplikasi.
- Kunci localStorage dan format backup (`EVOLYRIC2`, file `.evolyric`) sengaja sama dengan EvoLyric.

## Akun & cloud

`www/config.js` memakai project Supabase yang sama dengan EvoLyric (tabel `songs`, `app_data` JSONB). Satu akun Evo = satu library di semua aplikasi. Login Google memerlukan alamat EvoChords terdaftar sebagai Redirect URL di Supabase Auth (lihat SETUP-AUTH di repo EvoLyric).

## Impor Chordtela

`GET /api/chordtela?url=` (Worker) membaca halaman lagu Chordtela – format `<pre>` baru maupun `div.telabox` lama – lalu mengembalikan judul, artis, capo, section, chord, baris ketukan untuk intro/interlude, dan versi (chord dasar / original). Cache edge 1 hari, dikunci dengan `PARSER_VERSION`. Catatan: konten milik situs pihak ketiga; minta izin Chordtela sebelum dipakai di produk berbayar. Tempel teks memakai pembaca yang sama dan berjalan offline.

## Tes

- `npm run test:core` – Vitest untuk mesin chord & Worker.
- `npm run test:e2e` – semua tes end-to-end EvoLyric terhadap `www/` hasil build (jalankan `npm run build` dulu).
