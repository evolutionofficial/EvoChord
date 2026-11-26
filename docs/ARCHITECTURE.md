# Evo Chord – Arsitektur

Evo Chord adalah PWA untuk pemain musik: chord di atas lirik, transpose, auto-scroll, editor chord dengan keyboard khusus, dan impor dari Chordtela. Ini aplikasi saudara **EvoLyric** (untuk vokalis). Keduanya dirancang memakai **data lagu yang sama** supaya nanti bisa tersambung lewat satu akun Evo.

## Struktur modul

```
src/
  core/                 ← logika murni, tanpa DOM, bisa dites & dipakai di Worker
    chord.js            nama chord: parse, transpose, tata bahasa keyboard chord
    song.js             model lagu (sama dengan EvoLyric), baris siap-render, transpose lagu
    chordsheet.js       lembar chord teks / halaman Chordtela → lagu Evo
    remap.js            chord ikut pindah baris saat lirik diedit (sama dengan EvoLyric)
    store.js            library lokal (localStorage) + preferensi
    sync.js             kontrak baris cloud Supabase, sama dengan EvoLyric
  features/
    import/importer.js  impor dari link Chordtela (lewat Worker) atau teks tempel
  ui/
    app.js              router hash + siklus hidup view
    dom.js              helper DOM (esc, icon, toast, confirmDialog)
    libraryView.js      daftar lagu
    songView.js         tampilan lagu: chord di atas lirik, transpose, ukuran huruf, auto-scroll
    chordEditorView.js  kotak chord (1 kotak per 2 karakter) + keyboard chord
    lyricEditView.js    judul, artis, nada, capo, lirik (teks polos)
    importView.js       impor Chordtela / tempel teks, pratinjau, pilih versi
  styles.css            token tema & komponen bersama
worker/index.js         Cloudflare Worker: aset statis + /api/chordtela
tests/                  Vitest (core + worker)
```

Aturan:
- `core/` tidak boleh menyentuh DOM, `fetch`, atau storage global (store menerima storage sebagai parameter).
- Tiap view punya CSS sendiri dengan prefix class (`lv-`, `sv-`, `ce-`, `le-`, `iv-`).
- Semua teks lagu/pengguna masuk HTML lewat `esc()`.

## Model lagu (dibagi dengan EvoLyric)

```js
{
  id, title, artist,
  lyrics: "[Verse]\nbaris lirik\n...",   // "[...]" = label section
  key: "G", capo: 2,
  chords: [{ l: 3, c: 8, n: "Am" }],       // l = index baris mentah, c = index karakter genap
  source: { site: "chordtela", url },      // opsional
  createdAt, updatedAt
}
```

- Posisi chord memakai **teks terlihat** baris (markup warna EvoLyric `{r:...}` dibuang), satu kotak per 2 karakter. Format ini sama persis dengan fitur chord EvoLyric v180+, jadi chord yang diisi di satu aplikasi langsung tampil benar di aplikasi lain.
- Baris instrumental hasil impor (intro/interlude tanpa lirik) berisi titik `·` di posisi chord. Evo Chord menampilkannya sebagai deretan chip chord; di EvoLyric tampil sebagai titik di bawah chord.
- Field lain yang tidak dikenal (milik EvoLyric: `colors`, `ann`, `speed`, dll.) **tidak dibuang** oleh `normalizeSong`.

## Sambungan ke EvoLyric (rencana)

EvoLyric menyimpan lagu di tabel Supabase `songs`:
`{ id, user_id, local_id, title, artist, lyrics, app_data (JSONB), created_at, updated_at }`.
Semua field selain `title/artist/lyrics` masuk `app_data`. `core/sync.js` (`toCloudRow`, `fromCloudRow`) memakai aturan yang sama dan sudah dites.

Langkah untuk menyambungkan (belum aktif di v0.1):
1. Login Supabase yang sama dengan EvoLyric (project & tabel yang sama).
2. Pull: baris `songs` milik user → `fromCloudRow` → `store.put`.
3. Push: lagu berubah → `toCloudRow` → upsert (onConflict `id`), dengan peta `local_id → id` seperti di EvoLyric `cloud.js`.
4. Konflik: `updated_at` terbaru menang (sama dengan EvoLyric).

Pembagian peran: lirik lengkap (highlight, anotasi, warna) diedit di EvoLyric; Evo Chord hanya mengedit lirik sebagai teks polos dan fokus ke chord.

## Impor Chordtela (eksperimen)

`GET /api/chordtela?url=<halaman lagu chordtela>` di Worker:
1. Hanya menerima `https://(www.)chordtela.com/YYYY/MM/<slug>.html`.
2. Mengambil halaman, mengambil blok `<pre>` dengan chord terbanyak, membuang script/style.
3. `parseChordtelaHtml` → judul & artis dari heading halaman, capo, section (Intro/Reff/…), "Back to Reff" diulang otomatis, dan **versi**: Chordtela sering memuat "chord dasar" lalu "ORIGINAL VERSION/CHORD"; keduanya dikembalikan di `versions`.
4. Hasil di-cache 1 hari di edge.

Diukur di 12 halaman nyata (Nov 2026): ambil halaman ±10–160 ms, proses ±1–3 ms per lagu.

Catatan: fitur ini mengambil konten situs pihak ketiga. Sebelum dipakai di produk berbayar, minta izin/kerja sama dengan Chordtela. Fallback yang selalu aman: **Tempel teks** (parser yang sama, jalan offline).

## Tes

`npm test` (Vitest): parser chord & lembar chord (termasuk contoh halaman Chordtela buatan sendiri di `tests/fixtures`), model lagu, remap, store, kontrak cloud, dan Worker (fetch di-mock).
