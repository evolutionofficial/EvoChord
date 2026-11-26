import './libraryView.css';
import { esc, icon, $ } from './dom.js';
import { chordsUsed } from '../core/song.js';

export function render(root, ctx) {
  const { store, go } = ctx;
  let query = '';

  root.innerHTML = `
    <header class="top">
      <img src="/icon.svg" width="30" height="30" alt="">
      <h1 class="brand">Evo Chord</h1>
      <button class="icon-btn flat" id="lv-theme" type="button" aria-label="Ganti tema"></button>
    </header>
    <div class="lv-actions">
      <button class="btn primary" type="button" data-go="/import">${icon('link', 20)} Impor Chord</button>
      <button class="btn" type="button" data-go="/edit/new">${icon('plus', 20)} Lagu baru</button>
    </div>
    <label class="lv-search">
      <span class="lv-search-icon">${icon('search', 18)}</span>
      <input class="input" type="search" id="lv-q" placeholder="Cari judul atau artis" autocomplete="off">
    </label>
    <div id="lv-body"></div>`;

  function renderTheme() {
    const dark = store.prefs().theme !== 'light';
    $('#lv-theme', root).innerHTML = icon(dark ? 'sun' : 'moon', 22);
  }

  function itemHtml(song) {
    const meta = [];
    if (song.artist) meta.push(esc(song.artist));
    if (song.key) meta.push(`Nada ${esc(song.key)}`);
    const n = chordsUsed(song).length;
    if (n > 0) meta.push(`${n} chord`);
    return `<button class="lv-item card" type="button" data-id="${esc(song.id)}">
      <span class="lv-title">${esc(song.title)}</span>
      <span class="lv-meta muted">${meta.join(' · ')}</span>
    </button>`;
  }

  function renderBody() {
    const body = $('#lv-body', root);
    const all = store.list();
    if (!all.length) {
      body.innerHTML = `
        <div class="lv-empty">
          <span class="lv-empty-icon">${icon('music', 48)}</span>
          <h2>Belum ada lagu</h2>
          <button class="btn primary" type="button" data-go="/import">${icon('link', 20)} Impor Chord</button>
        </div>`;
      return;
    }
    const q = query.trim().toLowerCase();
    const songs = q
      ? all.filter((s) =>
          String(s.title ?? '').toLowerCase().includes(q) ||
          String(s.artist ?? '').toLowerCase().includes(q))
      : all;
    const count = `<div class="lv-count muted">${all.length} lagu</div>`;
    const list = songs.length
      ? `<div class="lv-list">${songs.map(itemHtml).join('')}</div>`
      : `<p class="lv-none muted">Tidak ada yang cocok</p>`;
    body.innerHTML = count + list;
  }

  function rerender() {
    renderTheme();
    renderBody();
  }

  function onClick(e) {
    const goEl = e.target.closest('[data-go]');
    if (goEl) return go(goEl.dataset.go);
    const item = e.target.closest('.lv-item');
    if (item) return go('/song/' + item.dataset.id);
    if (e.target.closest('#lv-theme')) {
      store.setPrefs({ theme: store.prefs().theme === 'light' ? 'dark' : 'light' });
    }
  }

  function onInput(e) {
    if (e.target.id !== 'lv-q') return;
    query = e.target.value;
    renderBody();
  }

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  rerender();
  const unsub = store.subscribe(rerender);

  return () => {
    unsub();
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
  };
}
