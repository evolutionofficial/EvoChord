// Chord sheet → Evo song.
//
// Reads the common "chord line above lyric line" format (Chordtela and most Indonesian
// chord sites, or text the user pasted) and returns lyrics + chords in the Evo song format
// (see song.js). Pure string code: runs in the browser and in the Cloudflare Worker.

import { isChord, parseChord } from './chord.js';

// ---------------------------------------------------------------------------
// Section labels

const SECTION_WORDS = {
  intro: 'Intro', int: 'Intro',
  verse: 'Verse', bait: 'Verse', ayat: 'Verse',
  reff: 'Chorus', ref: 'Chorus', chorus: 'Chorus', refrain: 'Chorus',
  prechorus: 'Pre-Chorus', prereff: 'Pre-Chorus', preref: 'Pre-Chorus',
  bridge: 'Bridge',
  interlude: 'Interlude', musik: 'Interlude', music: 'Interlude', instrumen: 'Interlude', instrumental: 'Interlude', melodi: 'Interlude',
  outro: 'Outro', coda: 'Outro', ending: 'Outro',
};
const LABEL_RE = /^(\s*)[[(]?\s*(intro|int|verse|bait|ayat|reff|ref|refrain|chorus|pre[- ]?chorus|pre[- ]?reff?|bridge|interlude|musik|music|instrumental|instrumen|melodi|outro|coda|ending)\b\.?\s*(\d{0,2})\s*[\])]?\s*(:|$)?/i;

function labelName(word, num) {
  const base = SECTION_WORDS[word.toLowerCase().replace(/[- ]/g, '')] || word;
  return num ? `${base} ${num}` : base;
}

/** A label at the start of a line: "Intro :", "Reff:", "[Chorus]", "Bait 2". Returns the label and its length, or null. */
function readLabel(line, restIsChordsOrEmpty) {
  const m = LABEL_RE.exec(line);
  if (!m) return null;
  const rest = line.slice(m[0].length);
  // Without a colon or brackets the word must stand alone or be followed by chords ("Intro C G Am").
  const hasColon = m[4] === ':';
  const bracketed = /[[(]/.test(m[0]);
  if (!hasColon && !bracketed && rest.trim() && !restIsChordsOrEmpty(rest)) return null;
  return { name: labelName(m[2], m[3]), len: m[0].length };
}

// ---------------------------------------------------------------------------
// Chord lines

const IGNORABLE = /^(?:x?\d+x?|\(?\d+x\)?|n\.?c\.?|-+|\.+|\/|%|:)$/i;

function cleanToken(tok) {
  return tok.replace(/^[(.,:\-]+/, '').replace(/[).,:\-]+$/, '');
}

/** Chord names with their column in the line, or null if the line is not a chord line. */
export function readChordLine(line) {
  const found = [];
  let other = 0;
  const re = /[^\s|]+/g;
  line = line.replace(/N\.C\./gi, (x) => ' '.repeat(x.length));
  let m;
  while ((m = re.exec(line))) {
    // "Am-F" and "Am..F" style: split on hyphens or dot runs between chords (separators kept for columns).
    const parts = m[0].split(/(?<=\S)(?:-|\.{2,})(?=[A-G])/);
    let off = 0;
    for (const part of parts) {
      off = m[0].indexOf(part, off);
      const clean = cleanToken(part);
      const lead = part.indexOf(clean);
      if (clean && isChord(clean)) found.push({ col: m.index + off + Math.max(0, lead), n: normalizeName(clean) });
      else if (clean && !IGNORABLE.test(clean)) other++;
      off += part.length;
    }
  }
  return found.length && !other ? found : null;
}

function normalizeName(n) {
  const p = parseChord(n);
  return p ? p.root + p.acc + p.quality + (p.bass ? '/' + p.bass : '') : n;
}

// ---------------------------------------------------------------------------
// Meta lines

const KEY_RE = /^\s*(?:do|nada\s+dasar|key|kunci|tone)\s*[:=]\s*([A-G][#b]?m?)\b/i;
const CAPO_RE = /\bcapo\b[^\d\n]{0,14}?(\d{1,2})\b/i;
const BACK_RE = /^\s*\*?\s*(?:back\s+to|kembali\s+ke|balik\s+ke|repeat|ulang(?:i)?|ke)\s+(reff?|chorus|refrain|verse|bait|intro|bridge|pre[- ]?chorus)\b/i;
const SKIP_RE = /^\s*(?:\*+|chord\s+by|kunci\s+gitar|add\s+to\s+playlist|tuning|original\s+key|capo|strum|genre|lirik|lyrics?\s+by|\(?\s*\d+\s*x\s*\)?$)/i;

// ---------------------------------------------------------------------------

/**
 * Parse a chord sheet.
 * @param {string} text
 * @param {{titleLine?: boolean}} [opts] titleLine: the first non-empty line is "Artist - Title".
 * @returns {{title:string, artist:string, key:string, keyGuessed:boolean, capo:number, lyrics:string, chords:Array<{l:number,c:number,n:string}>}}
 */
export function parseChordSheet(text, opts = {}) {
  const src = String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/ /g, ' ')
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''));

  let title = '';
  let artist = '';
  let key = '';
  let capo = 0;
  const out = []; // lyric lines
  const chords = [];
  const sections = []; // {name, start, end}

  const isChordsOrEmpty = (s) => !s.trim() || !!readChordLine(s);
  const blank = () => {
    if (out.length && out[out.length - 1] !== '') out.push('');
  };
  const openSection = (name) => {
    if (sections.length && sections[sections.length - 1].end == null) sections[sections.length - 1].end = out.length;
    blank();
    if (out.length === 1 && out[0] === '') out.pop();
    sections.push({ name, start: out.length, end: null });
    out.push(`[${name}]`);
  };
  const place = (l, col, n) => {
    let c = Math.max(0, col) - (Math.max(0, col) % 2);
    const used = new Set(chords.filter((x) => x.l === l).map((x) => x.c));
    while (used.has(c)) c += 2;
    if (out[l].length < c + 1) out[l] = out[l].padEnd(c + 1, ' ');
    chords.push({ l, c, n });
  };

  let i = 0;
  // Title line ("Artist - Title")
  const firstIdx = src.findIndex((l) => l.trim());
  if (firstIdx >= 0) {
    const t = src[firstIdx].trim();
    const m = /^(.{1,80}?)\s+[-–]\s+(.{1,100})$/.exec(t);
    if (m && !readChordLine(t) && !LABEL_RE.test(t) && (opts.titleLine || firstIdx < 3)) {
      artist = m[1].trim();
      title = m[2].trim();
      i = firstIdx + 1;
    }
  }

  for (; i < src.length; i++) {
    let line = src[i];
    const tr = line.trim();
    if (!tr) {
      blank();
      continue;
    }

    const km = KEY_RE.exec(tr);
    if (km) {
      key = km[1];
      continue;
    }
    const cm = CAPO_RE.exec(tr);
    if (cm && tr.length < 40 && !readChordLine(tr)) {
      capo = +cm[1];
      continue;
    }

    const back = BACK_RE.exec(tr);
    if (back) {
      const want = labelName(back[1], '').split(' ')[0];
      const sec = [...sections].reverse().find((s) => s.name.split(' ')[0] === want);
      if (sec) copySection(sec);
      continue;
    }
    if (SKIP_RE.test(tr)) continue;

    // Section label at the start (blanked out so chord columns stay aligned).
    const lab = readLabel(line, isChordsOrEmpty);
    if (lab) {
      openSection(lab.name);
      line = ' '.repeat(lab.len) + line.slice(lab.len);
      if (!line.trim()) continue;
    }

    const found = readChordLine(line);
    if (found) {
      const next = src[i + 1] ?? '';
      const nextIsLyric =
        next.trim() &&
        !readChordLine(next) &&
        !readLabel(next, isChordsOrEmpty) &&
        !BACK_RE.test(next) &&
        !SKIP_RE.test(next.trim()) &&
        !KEY_RE.test(next.trim());
      if (nextIsLyric) {
        const lead = next.length - next.trimStart().length;
        out.push(next.slice(lead));
        const l = out.length - 1;
        for (const f of found) place(l, f.col - lead, f.n);
        i++;
      } else {
        // Instrumental row: "·" placeholders keep the chords in order and spaced like the original.
        const base = found[0].col;
        out.push('');
        const l = out.length - 1;
        let last = -2;
        for (const f of found) {
          let c = Math.max(f.col - base, last + 2);
          c -= c % 2;
          if (c <= last) c = last + 2;
          out[l] = out[l].padEnd(c, ' ') + '·';
          chords.push({ l, c, n: f.n });
          last = c;
        }
      }
      continue;
    }

    const lead = line.length - line.trimStart().length;
    out.push(line.slice(lead));
  }
  if (sections.length && sections[sections.length - 1].end == null) sections[sections.length - 1].end = out.length;

  function copySection(sec) {
    const end = sec.end ?? out.length;
    const offset = () => out.length - sec.start;
    blank();
    const delta = offset();
    // A labelled block runs until its first blank line (unlabelled verses often follow it).
    let lines = out.slice(sec.start, end);
    const gap = lines.indexOf('', 2);
    if (gap > 0) lines = lines.slice(0, gap);
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    const copied = chords.filter((x) => x.l >= sec.start && x.l < sec.start + lines.length);
    out.push(...lines);
    for (const x of copied) chords.push({ l: x.l + delta, c: x.c, n: x.n });
  }

  // Trim blank lines at both ends, shifting chord line numbers.
  let head = 0;
  while (head < out.length && out[head] === '') head++;
  let tail = out.length;
  while (tail > head && out[tail - 1] === '') tail--;
  const lyricsLines = out.slice(head, tail);
  const finalChords = chords
    .map((x) => ({ l: x.l - head, c: x.c, n: x.n }))
    .filter((x) => x.l >= 0 && x.l < lyricsLines.length)
    .sort((a, b) => a.l - b.l || a.c - b.c);

  let keyGuessed = false;
  if (!key) {
    const first = finalChords.find((x) => !/^[·\s]+$/.test(lyricsLines[x.l])) || finalChords[0];
    const p = first && parseChord(first.n);
    if (p) {
      key = p.root + p.acc + (/^m(?!aj)/.test(p.quality) ? 'm' : '');
      keyGuessed = true;
    }
  }

  return { title, artist, key, keyGuessed, capo, lyrics: lyricsLines.join('\n'), chords: finalChords };
}

// ---------------------------------------------------------------------------
// Chordtela HTML

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : all;
    }
    return ENTITIES[e.toLowerCase()] ?? all;
  });
}

/** The chord sheet text inside a Chordtela song page, or null. */
export function chordtelaHtmlToText(html) {
  const pres = [...String(html ?? '').matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi)].map((m) => m[1]);
  if (!pres.length) return null;
  // The song is the <pre> with the most chord links.
  const best = pres
    .map((p) => ({ p, score: (p.match(/tbi-tooltip/g) || []).length }))
    .sort((a, b) => b.score - a.score)[0].p;
  const text = best
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<span\b[^>]*class="[^"]*\bcustom\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(text);
}

/** Only real Chordtela song pages are accepted (used by the Worker before fetching). */
export function isChordtelaSongUrl(u) {
  try {
    const url = new URL(u);
    return (
      url.protocol === 'https:' &&
      /^(www\.)?chordtela\.com$/i.test(url.hostname) &&
      /^\/\d{4}\/\d{2}\/[a-z0-9-]+\.html$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

/** "Artist - Title" from the page heading ("Kunci Gitar Artist - Title Chord Dasar ©ChordTela.com"). */
function pageTitle(html) {
  const raw = (/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || /<title>([^<]*)/i.exec(html) || [])[1] || '';
  const t = decodeEntities(raw.replace(/<[^>]+>/g, ''))
    .replace(/^\s*(?:kunci\s+gitar|chord(?:\s+gitar)?)\s+/i, '')
    .replace(/\s+chord\s+dasar.*$/i, '')
    .replace(/\s*[©|].*$/, '')
    .trim();
  const m = /^(.{1,80}?)\s+[-–]\s+(.{1,120})$/.exec(t);
  return m ? { artist: m[1].trim(), title: m[2].trim() } : { artist: '', title: t };
}

// Chordtela pages often hold an easy "chord dasar" version first and the original version after a divider.
// "===ORIGINAL VERSION===", "===ORIGINAL CHORD===", "== VERSI ASLI =="
const VERSION_SPLIT = /^\s*(?:-{3,}\s*)?={2,}\s*([^=\n]*?(?:version|versi|chord|original|asli)[^=\n]*?)\s*={2,}\s*$/im;
const VERSION_NOISE = /^\s*(?:-{3,}|lihat\s+pula\b.*|.*\bversi\s+chord\b.*)\s*$/gim;

/**
 * Parse a Chordtela song page into song fields (no id).
 * Top-level fields are the first version on the page; `versions` lists every version found
 * ({ name, key, keyGuessed, capo, lyrics, chords }).
 */
export function parseChordtelaHtml(html, url = '') {
  const text = chordtelaHtmlToText(html);
  if (!text) return null;
  const head = pageTitle(html);
  const parts = text.split(VERSION_SPLIT); // [first, label, second, ...]
  const versions = [];
  for (let k = 0; k < parts.length; k += 2) {
    const chunk = parts[k].replace(VERSION_NOISE, '');
    const r = parseChordSheet(chunk, { titleLine: k === 0 });
    if (!r.lyrics.trim() || !r.chords.length) continue;
    const label = k === 0 ? 'Chord dasar' : /original|asli/i.test(parts[k - 1]) ? 'Versi original' : 'Versi lain';
    versions.push({ name: label, key: r.key, keyGuessed: r.keyGuessed, capo: r.capo, lyrics: r.lyrics, chords: r.chords, _t: r });
  }
  if (!versions.length) return null;
  const first = versions[0]._t;
  versions.forEach((v) => delete v._t);
  return {
    title: head.title || first.title,
    artist: head.artist || first.artist,
    key: first.key,
    keyGuessed: first.keyGuessed,
    capo: first.capo,
    lyrics: first.lyrics,
    chords: first.chords,
    versions,
    source: url ? { site: 'chordtela', url } : undefined,
  };
}
