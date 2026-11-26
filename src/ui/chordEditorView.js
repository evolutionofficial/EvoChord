import './chordEditorView.css';
import { esc, $$, icon, toast, confirmDialog } from './dom.js';
import {
  visibleText,
  sectionName,
  isNoteLine,
  isInstrumentalLine,
  gridCells,
  padLyricsForChords,
} from '../core/song.js';
import { KEY_ROWS, canPress, press, backspace } from '../core/chord.js';
import { isBeatLine, readBeatLine, resizeBeatLine, makeBeatLine, TIME_SIGS } from '../core/beats.js';

// Editor chord: grid seragam (jumlah kotak sama di semua baris), baris ketukan, plus keyboard chord.
export function render(root, ctx, params) {
  const [id] = params || [];
  const song = ctx.store.get(id);
  if (!song) {
    toast('Lagu tidak ditemukan', { error: true });
    ctx.go('/');
    return;
  }

  // "l:c" -> nama chord
  const map = {};
  for (const x of song.chords || []) map[`${x.l}:${x.c}`] = x.n;

  // Baris lirik (bisa bertambah/berkurang karena baris ketukan).
  const lines = song.lyrics.split('\n');

  const now = () =>
    Object.entries(map)
      .map(([k, n]) => {
        const [l, c] = k.split(':').map(Number);
        return { l, c, n };
      })
      .sort((a, b) => a.l - b.l || a.c - b.c);

  const snapshot = () => JSON.stringify({ lines, chords: now() });
  const start = snapshot();
  let sel = -1;
  let buf = '';
  const cells = []; // { l, c, el, nEl }

  const cellKey = (cell) => `${cell.l}:${cell.c}`;

  // --- Bar atas -----------------------------------------------------------
  const top = document.createElement('div');
  top.className = 'top';
  top.innerHTML = `
    <button type="button" class="icon-btn flat" aria-label="Tutup">${icon('close')}</button>
    <h1>Chord</h1>
    <button type="button" class="btn primary">Simpan</button>`;
  root.appendChild(top);

  async function close() {
    if (snapshot() !== start) {
      const ok = await confirmDialog({ title: 'Buang perubahan chord?', ok: 'Buang', danger: true });
      if (!ok) return;
    }
    ctx.go('/song/' + id);
  }

  top.querySelector('.icon-btn').addEventListener('click', close);
  top.querySelector('.btn.primary').addEventListener('click', () => {
    const chords = now();
    const lyrics = padLyricsForChords(lines.join('\n'), chords);
    ctx.store.put({ ...song, lyrics, chords });
    toast('Chord disimpan');
    ctx.go('/song/' + id);
  });

  // --- Grid ---------------------------------------------------------------
  const grid = document.createElement('div');
  grid.className = 'ce-grid';
  root.appendChild(grid);

  const curPos = () => (sel >= 0 && cells[sel] ? { l: cells[sel].l, c: cells[sel].c } : null);
  const shiftPos = (p, from, delta) => (p && p.l >= from ? { l: p.l + delta, c: p.c } : p);

  // Geser semua kunci chord baris >= from sebesar delta.
  function shiftRows(from, delta) {
    const entries = Object.entries(map);
    for (const k of Object.keys(map)) delete map[k];
    for (const [k, n] of entries) {
      const [l, c] = k.split(':').map(Number);
      map[`${l >= from ? l + delta : l}:${c}`] = n;
    }
  }

  // Hapus chord baris l dengan kotak c >= fromCell.
  function dropChords(l, fromCell) {
    for (const k of Object.keys(map)) {
      const [kl, kc] = k.split(':').map(Number);
      if (kl === l && kc >= fromCell) delete map[k];
    }
  }

  function beatControls(l, line) {
    const { timeSig } = readBeatLine(line);
    const ctl = document.createElement('div');
    ctl.className = 'ce-bctl';
    ctl.innerHTML = `<select class="ce-tsig" data-l="${l}" aria-label="Birama">${TIME_SIGS.map(
      (t) => `<option value="${t}"${t === timeSig ? ' selected' : ''}>${t}</option>`
    ).join('')}</select><button type="button" class="ce-bbtn" data-b="minus" data-l="${l}" aria-label="Kurangi birama">−</button><button type="button" class="ce-bbtn" data-b="plus" data-l="${l}" aria-label="Tambah birama">+</button><button type="button" class="ce-bbtn" data-b="trash" data-l="${l}" aria-label="Hapus baris ketukan">${icon('trash', 18)}</button>`;
    return ctl;
  }

  // Bangun ulang grid dari lines + map. keep = {l,c} kotak yang tetap dipilih bila masih ada.
  function buildGrid(keep = curPos()) {
    grid.innerHTML = '';
    cells.length = 0;
    const n = gridCells({ lyrics: lines.join('\n'), chords: now() });

    const addTop = document.createElement('div');
    addTop.className = 'ce-top';
    addTop.innerHTML = `<button type="button" class="ce-add" data-b="add-top" aria-label="Tambah baris ketukan di awal">+ Ketukan di awal</button>`;
    grid.appendChild(addTop);

    lines.forEach((line, l) => {
      const sec = sectionName(line);
      if (sec) {
        const d = document.createElement('div');
        d.className = 'ce-sec';
        d.innerHTML = `<span>${esc(sec)}</span><button type="button" class="ce-add" data-b="add" data-l="${l}" aria-label="Tambah baris ketukan">+ Ketukan</button>`;
        grid.appendChild(d);
        return;
      }
      if (!line.trim()) {
        const d = document.createElement('div');
        d.className = 'ce-gap';
        grid.appendChild(d);
        return;
      }
      if (isNoteLine(line)) return;

      const v = visibleText(line);
      const beat = isBeatLine(line);
      const row = document.createElement('div');
      row.className = beat ? 'ce-row ce-inst ce-beat' : isInstrumentalLine(line) ? 'ce-row ce-inst' : 'ce-row';
      for (let i = 0; i < n; i++) {
        const c = i * 2;
        const name = map[`${l}:${c}`] || '';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = c >= v.length ? 'ce-cell ce-x' : 'ce-cell';
        btn.dataset.i = String(cells.length);
        btn.innerHTML = `<b class="ce-n">${esc(name)}</b><span class="ce-t">${esc(v.slice(c, c + 2))}</span>`;
        row.appendChild(btn);
        cells.push({ l, c, el: btn, nEl: btn.querySelector('.ce-n') });
      }
      if (beat) row.appendChild(beatControls(l, line));
      grid.appendChild(row);
    });

    const idx = keep ? cells.findIndex((x) => x.l === keep.l && x.c === keep.c) : -1;
    select(idx);
  }

  // --- Baris ketukan ------------------------------------------------------
  function resizeBeat(l, delta) {
    lines[l] = resizeBeatLine(lines[l], delta);
    dropChords(l, visibleText(lines[l]).length);
    buildGrid();
  }

  function setTimeSig(l, sig) {
    lines[l] = makeBeatLine(readBeatLine(lines[l]).bars, sig);
    dropChords(l, visibleText(lines[l]).length);
    buildGrid();
  }

  async function removeBeat(l) {
    if (now().some((x) => x.l === l)) {
      const ok = await confirmDialog({ title: 'Hapus baris ketukan ini?', ok: 'Hapus', danger: true });
      if (!ok) return;
    }
    const pos = curPos();
    const keep = pos && pos.l === l ? null : shiftPos(pos, l + 1, -1);
    dropChords(l, 0);
    shiftRows(l + 1, -1);
    lines.splice(l, 1);
    buildGrid(keep);
  }

  function insertBeat(k) {
    const row = makeBeatLine(1, song.timeSig || '4/4');
    shiftRows(k, 1);
    lines.splice(k, 0, row);
    buildGrid(null);
    select(cells.findIndex((x) => x.l === k && x.c === 0));
  }

  // Baris ketukan baru jatuh setelah baris section dan baris ketukan yang sudah ada.
  function addBeatAfterSection(l) {
    let k = l + 1;
    while (k < lines.length && isBeatLine(lines[k])) k++;
    insertBeat(k);
  }

  grid.addEventListener('click', (e) => {
    const cell = e.target.closest('.ce-cell');
    if (cell && grid.contains(cell)) {
      select(Number(cell.dataset.i));
      return;
    }
    const b = e.target.closest('button[data-b]');
    if (!b || !grid.contains(b)) return;
    const l = Number(b.dataset.l);
    switch (b.dataset.b) {
      case 'add-top':
        insertBeat(0);
        break;
      case 'add':
        addBeatAfterSection(l);
        break;
      case 'minus':
        resizeBeat(l, -1);
        break;
      case 'plus':
        resizeBeat(l, 1);
        break;
      case 'trash':
        removeBeat(l);
        break;
    }
  });

  grid.addEventListener('change', (e) => {
    if (e.target.matches('.ce-tsig')) setTimeSig(Number(e.target.dataset.l), e.target.value);
  });

  // --- Keyboard -----------------------------------------------------------
  const kb = document.createElement('div');
  kb.className = 'ce-kb card';
  kb.hidden = true;
  kb.innerHTML = `
    <div class="ce-cur"></div>
    <div class="ce-chips"></div>
    ${KEY_ROWS.map(
      (row) =>
        `<div class="ce-keys">${row
          .map((k) => `<button type="button" class="ce-key" data-k="${esc(k)}">${esc(k)}</button>`)
          .join('')}</div>`
    ).join('')}
    <div class="ce-keys">
      <button type="button" class="ce-key" data-a="prev" aria-label="Kotak sebelumnya">◀</button>
      <button type="button" class="ce-key" data-a="next" aria-label="Kotak berikutnya">▶</button>
      <button type="button" class="ce-key" data-a="back" aria-label="Hapus mundur">⌫</button>
      <button type="button" class="ce-key" data-a="clear">Hapus</button>
      <button type="button" class="ce-key ce-done" data-a="done">Selesai</button>
    </div>`;
  root.appendChild(kb);

  const curEl = kb.querySelector('.ce-cur');
  const chipsEl = kb.querySelector('.ce-chips');

  function updateKeys() {
    curEl.textContent = buf || '–';

    const seen = [];
    for (const { n } of now()) {
      if (!seen.includes(n)) seen.push(n);
    }
    const list = seen.slice(0, 10);
    chipsEl.hidden = list.length === 0;
    chipsEl.innerHTML = list
      .map((n) => `<button type="button" class="ce-chip chord" data-r="${esc(n)}">${esc(n)}</button>`)
      .join('');

    for (const b of $$('[data-k]', kb)) {
      b.disabled = !canPress(buf, b.dataset.k);
    }
  }

  function select(i) {
    cells.forEach((x) => x.el.classList.remove('on'));
    if (i < 0 || i >= cells.length) {
      sel = -1;
      kb.hidden = true;
      root.style.paddingBottom = '';
      return;
    }
    sel = i;
    const cell = cells[i];
    cell.el.classList.add('on');
    buf = map[cellKey(cell)] || '';
    kb.hidden = false;
    root.style.paddingBottom = '330px';
    updateKeys();
    try {
      cell.el.scrollIntoView({ block: 'nearest' });
    } catch {
      /* abaikan */
    }
  }

  function set(n) {
    if (sel < 0) return;
    const cell = cells[sel];
    if (n) map[cellKey(cell)] = n;
    else delete map[cellKey(cell)];
    cell.nEl.textContent = n;
    buf = n;
    updateKeys();
  }

  kb.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !kb.contains(b) || sel < 0 || b.disabled) return;
    const last = cells.length - 1;

    if (b.dataset.r !== undefined) {
      set(b.dataset.r);
      select(Math.min(sel + 1, last));
    } else if (b.dataset.k !== undefined) {
      set(press(buf, b.dataset.k));
    } else {
      switch (b.dataset.a) {
        case 'prev':
          select(Math.max(0, sel - 1));
          break;
        case 'next':
          select(Math.min(last, sel + 1));
          break;
        case 'back':
          set(backspace(buf));
          break;
        case 'clear':
          set('');
          break;
        case 'done':
          select(-1);
          break;
      }
    }
  });

  buildGrid();
}
