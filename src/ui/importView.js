import './importView.css';
import { esc, $, icon, toast, confirmDialog } from './dom.js';
import { findChordtelaUrl, importFromChordtela, importFromText, resultToSong } from '../features/import/importer.js';
import { takePendingUrl } from '../features/import/pending.js';
import { sectionName } from '../core/song.js';

const SNIP_LINES = 10;

export function render(root, ctx) {
  const st = { tab: 'link', url: '', text: '', err: '', errCode: '', debug: null, busy: false, prev: null, base: null, verIdx: 0, ms: 0, title: '', artist: '' };
  let alive = true;

  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  const pending = takePendingUrl();
  if (pending) {
    st.tab = 'link';
    st.url = pending;
  }
  draw();
  if (pending) fetchLink();

  return () => {
    alive = false;
    root.removeEventListener('click', onClick);
    root.removeEventListener('input', onInput);
  };

  function draw() {
    root.innerHTML = `
      <header class="top">
        <button class="icon-btn flat" data-act="back" aria-label="Kembali">${icon('back')}</button>
        <h1>Impor Chord</h1>
      </header>
      ${st.prev ? previewHtml() : formHtml()}`;
  }

  function onInput(e) {
    const t = e.target;
    if (t.id === 'iv-url') st.url = t.value;
    else if (t.classList.contains('iv-ta')) st.text = t.value;
    else if (t.id === 'iv-title') st.title = t.value;
    else if (t.id === 'iv-artist') st.artist = t.value;
  }

  function onClick(e) {
    const el = e.target.closest('[data-act],[data-tab],[data-ver]');
    if (!el || !root.contains(el)) return;
    if (el.dataset.tab) {
      st.tab = el.dataset.tab;
      st.err = '';
      st.errCode = '';
      st.debug = null;
      draw();
      return;
    }
    if (el.dataset.ver !== undefined) {
      pickVersion(Number(el.dataset.ver));
      return;
    }
    switch (el.dataset.act) {
      case 'back': ctx.go('/'); break;
      case 'paste-link': pasteLink(); break;
      case 'fetch': fetchLink(); break;
      case 'use-paste': st.tab = 'paste'; st.err = ''; st.errCode = ''; st.debug = null; draw(); break;
      case 'paste-text': pasteText(); break;
      case 'process': processText(); break;
      case 'cancel': st.prev = null; st.err = ''; draw(); break;
      case 'save': save(); break;
    }
  }

  async function pasteLink() {
    let url = null;
    try {
      url = findChordtelaUrl(await navigator.clipboard.readText());
    } catch {
      url = null;
    }
    if (!url) {
      toast('Tidak ada link Chordtela di clipboard', { error: true });
      return;
    }
    st.url = url;
    const input = $('#iv-url', root);
    if (input) input.value = url;
  }

  async function fetchLink() {
    st.busy = true;
    st.err = '';
    st.errCode = '';
    st.debug = null;
    draw();
    const r = await importFromChordtela(st.url);
    if (!alive) return;
    st.busy = false;
    if (!r.ok) {
      st.err = r.message;
      st.errCode = r.error || '';
      st.debug = r.debug || null;
      draw();
      return;
    }
    showPreview(r);
  }

  async function pasteText() {
    try {
      const t = await navigator.clipboard.readText();
      st.text = t;
      const ta = $('.iv-ta', root);
      if (ta) ta.value = t;
    } catch {
      toast('Clipboard tidak bisa dibaca', { error: true });
    }
  }

  function processText() {
    const r = importFromText(st.text);
    if (!r.ok) {
      st.err = r.message;
      draw();
      return;
    }
    showPreview(r);
  }

  function showPreview(r) {
    st.base = r.result;
    st.prev = r.result;
    st.verIdx = 0;
    st.ms = r.ms;
    st.title = r.result.title || '';
    st.artist = r.result.artist || '';
    st.err = '';
    draw();
  }

  function pickVersion(i) {
    const v = st.base?.versions?.[i];
    if (!v) return;
    st.verIdx = i;
    st.prev = { ...st.base, key: v.key, keyGuessed: v.keyGuessed, capo: v.capo, lyrics: v.lyrics, chords: v.chords };
    draw();
  }

  async function save() {
    const title = st.title.trim();
    const artist = st.artist.trim();
    if (!title) {
      toast('Judul wajib diisi', { error: true });
      return;
    }
    if (ctx.store.findSame(title, artist)) {
      const ok = await confirmDialog({ title: 'Lagu ini sudah ada', message: 'Simpan sebagai lagu baru?', ok: 'Simpan' });
      if (!ok || !alive) return;
    }
    const data = { ...st.prev };
    delete data.versions;
    const s = ctx.store.put(resultToSong({ ...data, title, artist }));
    toast('Lagu tersimpan');
    ctx.go('/song/' + s.id);
  }

  function formHtml() {
    const linkOn = st.tab === 'link';
    const tabs = `
      <div class="iv-tabs" role="tablist">
        <button class="iv-tab${linkOn ? ' on' : ''}" role="tab" aria-selected="${linkOn}" data-tab="link">Link Chordtela</button>
        <button class="iv-tab${linkOn ? '' : ' on'}" role="tab" aria-selected="${!linkOn}" data-tab="paste">Tempel teks</button>
      </div>`;
    const err = st.err ? `<p class="iv-err" role="alert">${esc(st.err)}</p>` : '';
    const body = linkOn ? linkHtml(err) : pasteHtml(err);
    return `${tabs}<div class="iv-body">${body}</div>
      <p class="iv-note muted">Eksperimen: chord dibaca dari halaman Chordtela yang kamu pilih.</p>`;
  }

  function linkHtml(err) {
    return `
      <label class="field"><span>Link lagu Chordtela</span>
        <input class="input" id="iv-url" type="url" inputmode="url" placeholder="https://www.chordtela.com/…" autocomplete="off" value="${esc(st.url)}">
      </label>
      <button class="btn" data-act="paste-link">${icon('paste')} Tempel link</button>
      <button class="btn primary iv-full" data-act="fetch"${st.busy ? ' disabled' : ''}>${st.busy ? 'Mengambil…' : 'Ambil'}</button>
      <p class="iv-hint muted">Bisa juga: cari judul di Library, lalu "Cari di Chordtela".</p>
      ${err}${debugHtml()}${fallbackHtml()}`;
  }

  function debugHtml() {
    const d = st.debug;
    if (!st.err || !d) return '';
    return `<p class="iv-dbg muted">Info: status ${esc(d.status ?? '-')} · ${esc(d.bytes ?? '-')} byte · pre ${esc(d.pre ?? '-')} · link chord ${esc(d.chordLinks ?? '-')}${d.challenge ? ' · diblokir' : ''}</p>`;
  }

  function fallbackHtml() {
    if (!st.err || !['no_chords', 'blocked'].includes(st.errCode)) return '';
    return `<button class="btn iv-full" data-act="use-paste">Pakai Tempel teks</button>`;
  }

  function pasteHtml(err) {
    const lead = st.text.startsWith('\n') ? '\n' : '';
    return `
      <textarea class="input iv-ta" rows="12" placeholder="Tempel teks chord di sini" spellcheck="false">${lead}${esc(st.text)}</textarea>
      <button class="btn" data-act="paste-text">${icon('paste')} Tempel dari clipboard</button>
      <button class="btn primary iv-full" data-act="process">Proses</button>
      ${err}`;
  }

  function previewHtml() {
    const r = st.prev;
    const bits = [];
    if (r.key) bits.push(`Nada ${r.key}${r.keyGuessed ? ' (perkiraan)' : ''}`);
    if (r.capo) bits.push(`Capo ${r.capo}`);
    bits.push(`${r.lyrics.split('\n').length} baris`, `${r.chords.length} chord`);
    if (st.ms >= 50) bits.push(`${(st.ms / 1000).toFixed(1).replace('.', ',')} detik`);

    const vs = r.versions;
    const verHtml =
      vs?.length > 1
        ? `<div class="iv-tabs iv-vers" role="tablist">${vs
            .map((v, i) => {
              const on = i === st.verIdx;
              const label = v.name + (v.key ? ` · ${v.key}` : '');
              return `<button class="iv-tab${on ? ' on' : ''}" role="tab" aria-selected="${on}" data-ver="${i}">${esc(label)}</button>`;
            })
            .join('')}</div>`
        : '';

    return `
      <section class="iv-prev card">
        <div class="iv-prev-head">
          <button class="btn ghost iv-sm" data-act="cancel">${icon('back', 18)} Kembali</button>
        </div>
        <label class="field"><span>Judul</span>
          <input class="input" id="iv-title" value="${esc(st.title)}">
        </label>
        <label class="field"><span>Artis</span>
          <input class="input" id="iv-artist" value="${esc(st.artist)}">
        </label>
        ${verHtml}
        <p class="iv-info muted">${esc(bits.join(' · '))}</p>
        <pre class="iv-snip">${snippetHtml(r)}</pre>
        <div class="iv-actions">
          <button class="btn ghost" data-act="cancel">Batal</button>
          <button class="btn primary" data-act="save">Simpan ke Library</button>
        </div>
      </section>`;
  }

  function snippetHtml(r) {
    const byLine = new Map();
    for (const ch of r.chords) {
      if (!byLine.has(ch.l)) byLine.set(ch.l, []);
      byLine.get(ch.l).push(ch);
    }
    const out = [];
    r.lyrics.split('\n').slice(0, SNIP_LINES).forEach((text, i) => {
      if (sectionName(text) !== null) {
        out.push(`<span class="iv-sec">${esc(text)}</span>`);
        return;
      }
      const chords = byLine.get(i);
      if (chords) out.push(chordRow(chords));
      out.push(esc(text));
    });
    return out.join('\n');
  }

  function chordRow(chords) {
    let w = 0;
    let h = '';
    for (const ch of [...chords].sort((a, b) => a.c - b.c)) {
      const gap = ch.c - w;
      const sp = gap > 0 ? gap : w > 0 ? 1 : 0;
      h += ' '.repeat(sp) + `<span class="chord">${esc(ch.n)}</span>`;
      w += sp + ch.n.length;
    }
    return h;
  }
}
