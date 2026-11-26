import './chordEditorView.css';
import { esc, $$, icon, toast, confirmDialog } from './dom.js';
import { visibleText, sectionName, isNoteLine, isInstrumentalLine } from '../core/song.js';
import { KEY_ROWS, canPress, press, backspace } from '../core/chord.js';

// Editor chord: satu kotak per 2 karakter di atas lirik, plus keyboard chord.
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

  const now = () =>
    Object.entries(map)
      .map(([k, n]) => {
        const [l, c] = k.split(':').map(Number);
        return { l, c, n };
      })
      .sort((a, b) => a.l - b.l || a.c - b.c);

  const start = JSON.stringify(now());
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
    if (JSON.stringify(now()) !== start) {
      const ok = await confirmDialog({ title: 'Buang perubahan chord?', ok: 'Buang', danger: true });
      if (!ok) return;
    }
    ctx.go('/song/' + id);
  }

  top.querySelector('.icon-btn').addEventListener('click', close);
  top.querySelector('.btn.primary').addEventListener('click', () => {
    ctx.store.put({ ...song, chords: now() });
    toast('Chord disimpan');
    ctx.go('/song/' + id);
  });

  // --- Grid ---------------------------------------------------------------
  const grid = document.createElement('div');
  grid.className = 'ce-grid';
  root.appendChild(grid);

  song.lyrics.split('\n').forEach((line, l) => {
    const sec = sectionName(line);
    if (sec) {
      const d = document.createElement('div');
      d.className = 'ce-sec';
      d.textContent = sec;
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
    const row = document.createElement('div');
    row.className = isInstrumentalLine(line) ? 'ce-row ce-inst' : 'ce-row';
    for (let c = 0; c < v.length; c += 2) {
      const name = map[`${l}:${c}`] || '';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ce-cell';
      btn.dataset.i = String(cells.length);
      btn.innerHTML = `<b class="ce-n">${esc(name)}</b><span class="ce-t">${esc(v.slice(c, c + 2))}</span>`;
      row.appendChild(btn);
      cells.push({ l, c, el: btn, nEl: btn.querySelector('.ce-n') });
    }
    grid.appendChild(row);
  });

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.ce-cell');
    if (!btn || !grid.contains(btn)) return;
    select(Number(btn.dataset.i));
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
}
