import './songView.css';
import { esc, $, icon, toast, confirmDialog } from './dom.js';
import { songLines, transposeSong } from '../core/song.js';
import { transposeKey } from '../core/chord.js';
import { isBeatLine } from '../core/beats.js';
import { createScroller, SPEED_MIN, SPEED_MAX } from './scroller.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const DEFAULT_SPEED = 5;

/** Split a lyric line into chord segments: each chord starts a segment that runs to the next chord. */
function segmentsOf(text, chords) {
  const list = [...chords].sort((a, b) => a.c - b.c);
  const segs = [];
  if (list[0].c > 0) segs.push({ n: '', t: text.slice(0, list[0].c) });
  list.forEach((ch, i) => {
    const end = i + 1 < list.length ? list[i + 1].c : text.length;
    segs.push({ n: ch.n, t: text.slice(ch.c, end) });
  });
  return segs;
}

/** Chord segments as HTML: a chord above each segment of text. */
function chordSegsHtml(text, chords) {
  return segmentsOf(text, chords)
    .map(
      (s) =>
        `<span class="sv-seg"><span class="chord sv-c">${s.n ? esc(s.n) : '&nbsp;'}</span><span class="sv-t">${esc(s.t)}</span></span>`
    )
    .join('');
}

function lineHtml(line) {
  if (line.type === 'section') return `<div class="sv-sec">${esc(line.text)}</div>`;
  if (line.type === 'gap') return '<div class="sv-gap"></div>';
  if (line.type === 'instrumental') {
    if (isBeatLine(line.text)) {
      if (!line.chords.length) return `<div class="sv-line sv-beat"><span class="sv-t">${esc(line.text)}</span></div>`;
      return `<div class="sv-line sv-has sv-beat">${chordSegsHtml(line.text, line.chords)}</div>`;
    }
    const chips = line.chords.map((c) => `<span class="chord sv-chip">${esc(c.n)}</span>`).join('');
    return `<div class="sv-inst">${chips}</div>`;
  }
  if (!line.chords.length) return `<div class="sv-line">${esc(line.text)}</div>`;
  return `<div class="sv-line sv-has">${chordSegsHtml(line.text, line.chords)}</div>`;
}

export function render(root, ctx, params) {
  const [id] = params;
  let song = ctx.store.get(id);
  if (!song) {
    toast('Lagu tidak ditemukan', { error: true });
    ctx.go('/');
    return;
  }

  root.classList.add('sv-view');
  const hasChords = Array.isArray(song.chords) && song.chords.length > 0;
  let t = 0;
  let menuOpen = false;
  let speed = Number(song.speed) || DEFAULT_SPEED;
  let fontPx = ctx.store.prefs().fontSize;
  let speedT = 0;
  let fontT = 0;
  let panelT = 0;
  let pressing = false;

  root.innerHTML = `
    <header class="top sv-top">
      <button class="icon-btn flat" data-act="back" aria-label="Kembali">${icon('back')}</button>
      <div class="sv-title">
        <h1>${esc(song.title)}</h1>
        ${song.artist ? `<div class="sv-artist muted">${esc(song.artist)}</div>` : ''}
      </div>
      <button class="icon-btn flat" data-act="menu" aria-label="Menu" aria-expanded="false">${icon('more')}</button>
      <div class="card sv-menu" role="menu">
        <button role="menuitem" data-act="edit-lyric">Edit lirik</button>
        <button role="menuitem" data-act="edit-chord">Edit chord</button>
        <button role="menuitem" class="sv-danger" data-act="delete">Hapus lagu</button>
      </div>
    </header>
    <div class="sv-tools" id="sv-tools"></div>
    ${
      hasChords
        ? ''
        : `<div class="card sv-nochord">
            <span class="muted">Belum ada chord</span>
            <button class="btn" data-act="add-chord">Tambah chord</button>
          </div>`
    }
    <div class="sv-lyr" id="sv-lyr"><div class="sv-sheet" id="sv-sheet" style="font-size:${fontPx}px"></div></div>
    <div class="sv-hud" aria-hidden="true"><span>Kecepatan</span><div class="trk"><i></i><u></u></div><b></b></div>
    <div class="sv-spc">
      <div class="sv-spp" role="group" aria-label="Kecepatan">
        <div class="sv-sph"><span>Kecepatan</span><b class="sv-spv"></b><button class="sv-spx" type="button" aria-label="Tutup">⌄</button></div>
        <div class="sv-spr"><button class="sv-step" data-act="sp-minus" aria-label="Lebih lambat">−</button><input type="range" class="sv-sp" min="${SPEED_MIN}" max="${SPEED_MAX}" step="any" aria-label="Kecepatan gulir"><button class="sv-step" data-act="sp-plus" aria-label="Lebih cepat">+</button></div>
        <div class="sv-spm"><span>${SPEED_MIN}</span><span>${SPEED_MAX}</span></div>
      </div>
      <button class="sv-spb" type="button" aria-label="Kecepatan" aria-expanded="false"><b class="sv-spbv"></b><small>kecepatan</small></button>
    </div>`;

  const tools = $('#sv-tools', root);
  const sheet = $('#sv-sheet', root);
  const lyr = $('#sv-lyr', root);
  const menuBtn = $('[data-act="menu"]', root);
  const menu = $('.sv-menu', root);
  const spp = $('.sv-spp', root);
  const spb = $('.sv-spb', root);
  const slider = $('.sv-sp', root);

  const keyLabel = () => (song.key ? transposeKey(song.key, t) : '');
  const deltaLabel = () => (t > 0 ? `+${t}` : `${t}`);

  function drawTools() {
    const key = keyLabel();
    tools.innerHTML = `
      <span class="sv-tag">Nada ${key ? esc(key) : '?'}</span>
      ${song.capo ? `<span class="sv-tag">Capo ${esc(song.capo)}</span>` : ''}
      ${song.source?.site === 'chordtela' ? '<span class="sv-tag muted">Chordtela</span>' : ''}
      <span class="sv-spacer"></span>
      <button class="icon-btn" data-act="down" aria-label="Turunkan nada">${icon('minus', 18)}</button>
      <b class="sv-key">${esc(key || '?')}${t ? `<small>${deltaLabel()}</small>` : ''}</b>
      <button class="icon-btn" data-act="up" aria-label="Naikkan nada">${icon('plus', 18)}</button>
      ${t ? '<button class="btn primary sv-save" data-act="save">Simpan nada</button>' : ''}`;
  }

  function drawSheet() {
    sheet.innerHTML = songLines(song, { transpose: t }).map(lineHtml).join('') + '<div class="sv-end"></div>';
  }

  // Only the sheet and the tools are redrawn; the scroller keeps its element references.
  function refresh() {
    drawTools();
    drawSheet();
    scroller.sync();
  }

  function paintSpeed() {
    $('.sv-spv', root).textContent = Math.round(speed * 10) / 10;
    $('.sv-spbv', root).textContent = Math.round(speed);
    slider.value = speed;
  }

  function saveSpeed() {
    speedT = 0;
    if (!ctx.store.get(id)) return;
    song = ctx.store.put({ ...song, speed });
  }

  function setSpeed(v) {
    speed = Math.round(clamp(Number(v), SPEED_MIN, SPEED_MAX) * 10) / 10;
    paintSpeed();
    clearTimeout(speedT);
    speedT = setTimeout(saveSpeed, 400);
  }

  function saveFont() {
    fontT = 0;
    ctx.store.setPrefs({ fontSize: fontPx });
  }

  function setFont(v) {
    fontPx = v;
    sheet.style.fontSize = v + 'px';
    clearTimeout(fontT);
    fontT = setTimeout(saveFont, 400);
  }

  // Write pending speed/font changes right away (leaving the view, or before a save).
  function flush() {
    if (speedT) {
      clearTimeout(speedT);
      saveSpeed();
    }
    if (fontT) {
      clearTimeout(fontT);
      saveFont();
    }
  }

  function toggleMenu(on = !menuOpen) {
    menuOpen = on;
    menu.classList.toggle('open', on);
    menuBtn.setAttribute('aria-expanded', String(on));
  }

  function panelOpen(on) {
    spp.classList.toggle('open', on);
    spb.classList.toggle('hid', on);
    spb.setAttribute('aria-expanded', String(on));
    clearTimeout(panelT);
    if (on) panelTouch();
  }

  // The speed panel closes 3 s after the last touch, but never while a finger is on the slider.
  function panelTouch() {
    clearTimeout(panelT);
    panelT = setTimeout(() => {
      if (!pressing) panelOpen(false);
    }, 3000);
  }

  drawTools();
  drawSheet();
  paintSpeed();
  // EvoLyric places the speed HUD just inside the top of the lyrics.
  const placeHud = () => root.style.setProperty('--hud-top', lyr.offsetTop + 14 + 'px');
  requestAnimationFrame(placeHud);

  const scroller = createScroller({
    container: lyr,
    content: sheet,
    hud: $('.sv-hud', root),
    getSpeed: () => speed,
    setSpeed,
    getFont: () => fontPx,
    setFont,
    onPlayChange: (on) => root.classList.toggle('sv-run', on),
  });

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !root.contains(b)) return;

    switch (b.dataset.act) {
      case 'back':
        ctx.go('/');
        break;
      case 'menu':
        toggleMenu();
        break;
      case 'edit-lyric':
        toggleMenu(false);
        ctx.go('/edit/' + id);
        break;
      case 'edit-chord':
        toggleMenu(false);
        ctx.go('/chords/' + id);
        break;
      case 'add-chord':
        ctx.go('/chords/' + id);
        break;
      case 'delete': {
        toggleMenu(false);
        const ok = await confirmDialog({ title: 'Hapus lagu ini?', message: song.title, ok: 'Hapus', danger: true });
        if (!ok) break;
        ctx.store.remove(id);
        toast('Lagu dihapus');
        ctx.go('/');
        break;
      }
      case 'down':
        t = clamp(t - 1, -11, 11);
        refresh();
        break;
      case 'up':
        t = clamp(t + 1, -11, 11);
        refresh();
        break;
      case 'save':
        song = ctx.store.put(transposeSong(song, t));
        t = 0;
        refresh();
        toast('Nada disimpan');
        break;
      case 'sp-minus':
        setSpeed(speed - 1);
        panelTouch();
        break;
      case 'sp-plus':
        setSpeed(speed + 1);
        panelTouch();
        break;
    }
  });

  const onDocDown = (e) => {
    if (!menuOpen) return;
    if (e.target.closest?.('.sv-menu, [data-act="menu"]')) return;
    toggleMenu(false);
  };
  document.addEventListener('pointerdown', onDocDown);

  spb.addEventListener('click', () => panelOpen(!spp.classList.contains('open')));
  $('.sv-spx', root).addEventListener('click', () => panelOpen(false));
  spp.addEventListener('pointerdown', panelTouch);
  spp.addEventListener('click', panelTouch);
  spp.addEventListener('input', panelTouch);
  slider.addEventListener('input', () => setSpeed(slider.value));
  slider.addEventListener('pointerdown', () => {
    pressing = true;
    spp.classList.add('act');
    panelTouch();
  });
  const release = () => {
    if (!pressing) return;
    pressing = false;
    spp.classList.remove('act');
    panelTouch();
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);

  return () => {
    scroller.destroy();
    flush();
    clearTimeout(panelT);
    document.removeEventListener('pointerdown', onDocDown);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
  };
}
