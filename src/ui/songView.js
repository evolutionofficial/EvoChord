import './songView.css';
import { esc, $, icon, toast, confirmDialog } from './dom.js';
import { songLines, transposeSong } from '../core/song.js';
import { transposeKey } from '../core/chord.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

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

function lineHtml(line) {
  if (line.type === 'section') return `<div class="sv-sec">${esc(line.text)}</div>`;
  if (line.type === 'gap') return '<div class="sv-gap"></div>';
  if (line.type === 'instrumental') {
    const chips = line.chords.map((c) => `<span class="chord sv-chip">${esc(c.n)}</span>`).join('');
    return `<div class="sv-inst">${chips}</div>`;
  }
  if (!line.chords.length) return `<div class="sv-line">${esc(line.text)}</div>`;
  const segs = segmentsOf(line.text, line.chords)
    .map(
      (s) =>
        `<span class="sv-seg"><span class="chord sv-c">${s.n ? esc(s.n) : '&nbsp;'}</span><span class="sv-t">${esc(s.t)}</span></span>`
    )
    .join('');
  return `<div class="sv-line sv-has">${segs}</div>`;
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
  let t = 0;
  let menuOpen = false;
  let playing = false;
  let raf = 0;
  let last = null;
  let frac = 0;
  let wake = null;

  const keyLabel = () => (song.key ? transposeKey(song.key, t) : '');
  const deltaLabel = () => (t > 0 ? `+${t}` : `${t}`);

  function draw() {
    const prefs = ctx.store.prefs();
    const hasChords = Array.isArray(song.chords) && song.chords.length > 0;
    const key = keyLabel();
    const lines = songLines(song, { transpose: t }).map(lineHtml).join('');

    root.innerHTML = `
      <header class="top">
        <button class="icon-btn flat" data-act="back" aria-label="Kembali">${icon('back')}</button>
        <div class="sv-title">
          <h1>${esc(song.title)}</h1>
          ${song.artist ? `<div class="sv-artist muted">${esc(song.artist)}</div>` : ''}
        </div>
        <button class="icon-btn flat" data-act="menu" aria-label="Menu">${icon('more')}</button>
        ${
          menuOpen
            ? `<div class="card sv-menu" role="menu">
                <button role="menuitem" data-act="edit-lyric">Edit lirik</button>
                <button role="menuitem" data-act="edit-chord">Edit chord</button>
                <button role="menuitem" class="sv-danger" data-act="delete">Hapus lagu</button>
              </div>`
            : ''
        }
      </header>
      <div class="sv-info">
        <span class="sv-tag">Nada ${key ? esc(key) : '?'}</span>
        ${song.capo ? `<span class="sv-tag">Capo ${esc(song.capo)}</span>` : ''}
        ${song.source?.site === 'chordtela' ? '<span class="sv-tag muted">Chordtela</span>' : ''}
      </div>
      ${
        hasChords
          ? ''
          : `<div class="card sv-nochord">
              <span class="muted">Belum ada chord</span>
              <button class="btn" data-act="add-chord">Tambah chord</button>
            </div>`
      }
      <div class="sv-sheet" style="font-size:${prefs.fontSize}px">${lines}</div>
      <div class="card sv-bar">
        <div class="sv-group">
          <button class="icon-btn" data-act="down" aria-label="Turunkan nada">${icon('minus')}</button>
          <div class="sv-key">${esc(key || '?')}${t ? `<small>${deltaLabel()}</small>` : ''}</div>
          <button class="icon-btn" data-act="up" aria-label="Naikkan nada">${icon('plus')}</button>
          ${t ? '<button class="btn primary sv-save" data-act="save">Simpan nada</button>' : ''}
        </div>
        <div class="sv-group">
          <button class="btn sv-btn" data-act="font-down" aria-label="Perkecil huruf">A&minus;</button>
          <button class="btn sv-btn" data-act="font-up" aria-label="Perbesar huruf">A+</button>
        </div>
        <div class="sv-group">
          <button class="icon-btn" data-act="play" aria-label="Gulir otomatis">${icon(playing ? 'pause' : 'play')}</button>
          <button class="btn sv-btn" data-act="slower" aria-label="Lebih lambat">&minus;</button>
          <span class="sv-spd">${prefs.scrollSpeed}</span>
          <button class="btn sv-btn" data-act="faster" aria-label="Lebih cepat">+</button>
        </div>
      </div>`;
  }

  function atBottom() {
    return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  }

  async function requestWake() {
    try {
      const s = await navigator.wakeLock?.request('screen');
      if (!s) return;
      if (playing) wake = s;
      else s.release().catch(() => {});
    } catch {
      /* not supported or denied */
    }
  }

  function releaseWake() {
    const s = wake;
    wake = null;
    if (s) s.release().catch(() => {});
  }

  function tick(now) {
    if (!playing) return;
    const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
    last = now;
    const speed = ctx.store.prefs().scrollSpeed || 3;
    frac += speed * 14 * dt;
    const px = Math.floor(frac);
    if (px > 0) {
      frac -= px;
      window.scrollBy(0, px);
    }
    if (atBottom()) {
      setPlaying(false);
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function setPlaying(on) {
    playing = on;
    if (on) {
      frac = 0;
      last = null;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
      requestWake();
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
      releaseWake();
    }
    const b = $('[data-act="play"]', root);
    if (b) b.innerHTML = icon(on ? 'pause' : 'play');
  }

  const stopOnUser = () => {
    if (playing) setPlaying(false);
  };

  const onDocDown = (e) => {
    if (!menuOpen) return;
    if (e.target.closest?.('.sv-menu, [data-act="menu"]')) return;
    menuOpen = false;
    $('.sv-menu', root)?.remove();
  };

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !root.contains(b)) return;
    const act = b.dataset.act;
    const prefs = () => ctx.store.prefs();

    switch (act) {
      case 'back':
        ctx.go('/');
        break;
      case 'menu':
        menuOpen = !menuOpen;
        draw();
        break;
      case 'edit-lyric':
        menuOpen = false;
        ctx.go('/edit/' + id);
        break;
      case 'edit-chord':
        menuOpen = false;
        ctx.go('/chords/' + id);
        break;
      case 'add-chord':
        ctx.go('/chords/' + id);
        break;
      case 'delete': {
        menuOpen = false;
        draw();
        const ok = await confirmDialog({ title: 'Hapus lagu ini?', message: song.title, ok: 'Hapus', danger: true });
        if (!ok) break;
        ctx.store.remove(id);
        toast('Lagu dihapus');
        ctx.go('/');
        break;
      }
      case 'down':
        t = clamp(t - 1, -11, 11);
        draw();
        break;
      case 'up':
        t = clamp(t + 1, -11, 11);
        draw();
        break;
      case 'save':
        song = ctx.store.put(transposeSong(song, t));
        t = 0;
        draw();
        toast('Nada disimpan');
        break;
      case 'font-down':
        ctx.store.setPrefs({ fontSize: clamp(prefs().fontSize - 2, 14, 44) });
        draw();
        break;
      case 'font-up':
        ctx.store.setPrefs({ fontSize: clamp(prefs().fontSize + 2, 14, 44) });
        draw();
        break;
      case 'slower':
        ctx.store.setPrefs({ scrollSpeed: clamp(prefs().scrollSpeed - 1, 1, 10) });
        draw();
        break;
      case 'faster':
        ctx.store.setPrefs({ scrollSpeed: clamp(prefs().scrollSpeed + 1, 1, 10) });
        draw();
        break;
      case 'play':
        setPlaying(!playing);
        break;
    }
  });

  window.addEventListener('touchstart', stopOnUser, { passive: true });
  window.addEventListener('wheel', stopOnUser, { passive: true });
  document.addEventListener('pointerdown', onDocDown);

  draw();

  return () => {
    setPlaying(false);
    window.removeEventListener('touchstart', stopOnUser);
    window.removeEventListener('wheel', stopOnUser);
    document.removeEventListener('pointerdown', onDocDown);
  };
}
