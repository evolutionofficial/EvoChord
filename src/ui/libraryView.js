import './libraryView.css';
import { esc, icon, $, toast } from './dom.js';
import { chordsUsed } from '../core/song.js';
import { findChordtelaUrl } from '../features/import/importer.js';
import {
  chordtelaSearchUrl,
  markSearchStarted,
  searchStartedRecently,
  clearSearch,
  setPendingUrl,
} from '../features/import/pending.js';

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
    <div id="lv-body"></div>
    <div id="lv-bar"></div>`;

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
    if (!all.length && query.trim()) {
      body.innerHTML = webHtml(query.trim());
      return;
    }
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
    body.innerHTML = count + list + webHtml(query.trim());
  }

  function webHtml(text) {
    if (!text) return '';
    return `<button class="lv-web card" type="button" data-web="1">
      <span class="lv-web-icon">${icon('search', 22)}</span>
      <span class="lv-web-text">
        <b>Cari "${esc(text)}" di Chordtela</b>
        <span class="lv-web-sub muted">lewat Google</span>
      </span>
    </button>`;
  }

  function renderBanner() {
    const bar = $('#lv-bar', root);
    const show = searchStartedRecently();
    root.classList.toggle('lv-has-paste', show);
    bar.innerHTML = show
      ? `<div class="lv-paste card">
          <span class="lv-paste-text">Sudah dapat lagunya?</span>
          <button class="btn primary" type="button" id="lv-paste-go">${icon('paste', 20)} Tempel link</button>
          <button class="icon-btn flat" type="button" id="lv-paste-x" aria-label="Tutup">${icon('close', 20)}</button>
        </div>`
      : '';
  }

  async function pasteFromClipboard() {
    let url = null;
    try {
      url = findChordtelaUrl(await navigator.clipboard.readText());
    } catch {
      url = null;
    }
    if (!url) {
      toast('Belum ada link Chordtela yang disalin', { error: true });
      return;
    }
    setPendingUrl(url);
    clearSearch();
    go('/import');
  }

  function rerender() {
    renderTheme();
    renderBody();
    renderBanner();
  }

  function onClick(e) {
    const goEl = e.target.closest('[data-go]');
    if (goEl) return go(goEl.dataset.go);
    const item = e.target.closest('.lv-item');
    if (item) return go('/song/' + item.dataset.id);
    if (e.target.closest('.lv-web')) {
      markSearchStarted();
      window.open(chordtelaSearchUrl(query.trim()), '_blank', 'noopener');
      return rerender();
    }
    if (e.target.closest('#lv-paste-go')) return pasteFromClipboard();
    if (e.target.closest('#lv-paste-x')) {
      clearSearch();
      return renderBanner();
    }
    if (e.target.closest('#lv-theme')) {
      store.setPrefs({ theme: store.prefs().theme === 'light' ? 'dark' : 'light' });
    }
  }

  function onInput(e) {
    if (e.target.id !== 'lv-q') return;
    query = e.target.value;
    renderBody();
  }

  function onFocus() {
    renderBanner();
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') renderBanner();
  }

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  rerender();
  const unsub = store.subscribe(rerender);

  return () => {
    unsub();
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    root.classList.remove('lv-has-paste');
  };
}
