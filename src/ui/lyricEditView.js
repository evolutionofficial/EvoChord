import './lyricEditView.css';
import { esc, icon, toast, confirmDialog } from './dom.js';
import { newSong } from '../core/song.js';
import { remapChords } from '../core/remap.js';

const KEY_OPTIONS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm',
];

export function render(root, ctx, params) {
  const [id] = params;
  const isNew = id === 'new';
  const song = isNew ? newSong({}) : ctx.store.get(id);

  if (!song) {
    toast('Lagu tidak ditemukan', { error: true });
    ctx.go('/');
    return;
  }

  const initial = {
    title: song.title ?? '',
    artist: song.artist ?? '',
    key: song.key ?? '',
    capo: String(Number(song.capo) || 0),
    lyrics: song.lyrics ?? '',
  };

  const keys = [...KEY_OPTIONS];
  if (initial.key && !keys.includes(initial.key)) keys.push(initial.key);

  const keyOptions = [
    `<option value="">–</option>`,
    ...keys.map((k) => `<option value="${esc(k)}"${k === initial.key ? ' selected' : ''}>${esc(k)}</option>`),
  ].join('');

  const capoOptions = Array.from({ length: 12 }, (_, n) => {
    const label = n === 0 ? 'Tanpa capo' : String(n);
    return `<option value="${n}"${String(n) === initial.capo ? ' selected' : ''}>${label}</option>`;
  }).join('');

  root.innerHTML = `
    <header class="top le-top">
      <button class="icon-btn flat" id="le-back" aria-label="Kembali">${icon('back')}</button>
      <h1>${isNew ? 'Lagu baru' : 'Edit lirik'}</h1>
      <button class="btn primary" id="le-save">Simpan</button>
    </header>
    <div class="le-form">
      <label class="field">
        <span>Judul</span>
        <input class="input" id="le-title" value="${esc(initial.title)}">
      </label>
      <label class="field">
        <span>Artis</span>
        <input class="input" id="le-artist" value="${esc(initial.artist)}">
      </label>
      <div class="le-row">
        <label class="field">
          <span>Nada dasar</span>
          <select class="input" id="le-key">${keyOptions}</select>
        </label>
        <label class="field">
          <span>Capo</span>
          <select class="input" id="le-capo">${capoOptions}</select>
        </label>
      </div>
      <label class="field">
        <span>Lirik</span>
        <textarea class="input le-lyrics" id="le-lyrics" rows="16" spellcheck="false">${esc(initial.lyrics)}</textarea>
      </label>
      <p class="le-hint muted">[Verse], [Chorus], … menjadi judul bagian.</p>
    </div>
  `;

  const titleEl = root.querySelector('#le-title');
  const artistEl = root.querySelector('#le-artist');
  const keyEl = root.querySelector('#le-key');
  const capoEl = root.querySelector('#le-capo');
  const lyricsEl = root.querySelector('#le-lyrics');

  const isDirty = () =>
    titleEl.value !== initial.title ||
    artistEl.value !== initial.artist ||
    keyEl.value !== initial.key ||
    capoEl.value !== initial.capo ||
    lyricsEl.value !== initial.lyrics;

  async function goBack() {
    if (isDirty()) {
      const ok = await confirmDialog({ title: 'Buang perubahan?', ok: 'Buang', danger: true });
      if (!ok) return;
    }
    ctx.go(isNew ? '/' : '/song/' + id);
  }

  function save() {
    const title = titleEl.value.trim();
    if (!title) {
      toast('Judul wajib diisi', { error: true });
      titleEl.focus();
      return;
    }

    const nl = lyricsEl.value;
    const oldLyrics = song.lyrics ?? '';
    let chords = song.chords;
    if (!isNew && nl !== oldLyrics) {
      chords = remapChords(song.chords || [], oldLyrics, nl);
    }

    const s = ctx.store.put({
      ...song,
      title,
      artist: artistEl.value.trim(),
      key: keyEl.value,
      capo: Number(capoEl.value),
      lyrics: nl,
      chords,
    });

    toast(isNew ? 'Lagu dibuat' : 'Tersimpan');

    if (isNew && !(s.chords && s.chords.length)) {
      ctx.go('/chords/' + s.id);
    } else {
      ctx.go('/song/' + s.id);
    }
  }

  root.querySelector('#le-back').addEventListener('click', goBack);
  root.querySelector('#le-save').addEventListener('click', save);
}
