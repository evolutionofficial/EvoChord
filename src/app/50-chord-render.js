/* ===== EvoChords: chords in the lyrics screen =====
   Files 01–17 are EvoLyric as it is. Files 50+ are what EvoChords changes: a function declared here
   with the same name as an EvoLyric function replaces it everywhere (the files are joined into one script).

   Replaces chordApply (EvoLyric v180):
   - the chord name can be transposed on the fly (cur._tp semitones, see 51-chord-transpose.js)
   - chord names are kept apart: when a name would run into the next one, the text under the next chord
     moves right just enough (no overlapping chords, as in a printed chord sheet)
   - beat rows ("|• · • ·|", intros/interludes) get their own quiet monospace look
   The anchor stays an empty inline element and the name is drawn by CSS, so the text itself, its
   character offsets (annotations, tempo) and highlights do not change. */

function chordTp(){return (cur&&cur._tp)|0}
function chordFlats(){const k=(cur&&EvoCore.chord.normKey(cur.key))||(cur&&cur.chords&&cur.chords[0]&&cur.chords[0].n)||'C';
  return EvoCore.chord.prefersFlats(EvoCore.chord.transposeKey(k,chordTp()))}
function chordName(n){const t=chordTp();return t?EvoCore.chord.transposeChord(String(n||''),t,{flats:chordFlats()}):String(n||'')}

function chordApply(le,items){if(!le)return;
  le.forEach(d=>{if(d&&d.classList&&d.classList.contains('ln')&&EvoCore.beats.isBeatLine(d.textContent))d.classList.add('beat')});
  if(!items||!items.length)return;const by={};items.forEach(it=>{(by[it.l]=by[it.l]||[]).push(it)});
  le.forEach((d,l)=>{if(d&&d.classList&&d.classList.contains('beat'))chordBeatRow(d,by[l]||[])});
  Object.keys(by).forEach(l=>{const d=le[+l];if(!d||!d.classList||!d.classList.contains('ln')||d.classList.contains('beat'))return;const len=(d.textContent||'').length;if(!len)return;
    by[l].slice().sort((a,b)=>b.c-a.c).forEach(it=>{const c=Math.max(0,Math.min(it.c|0,len-1)),nodes=chNodes(d);
      for(const[nd,o]of nodes){if(c>=o&&c<o+nd.data.length){const a=E('span','chd');a.dataset.c=chordName(it.n);const r=nd.splitText(c-o);r.parentNode.insertBefore(a,r);break}}});
    d.classList.add('hasch')});
  chordSpaceSoon()}
/* Beat rows (intro, interlude) are shown short, the way chord sites write them: "C . C/E . | F . . . |",
   one token per beat. The row's own text stays in the line, hidden, and the short form is drawn with CSS
   from data-t (generated content is not text), so offsets of highlights and notes do not change. */
function chordBeatRow(d,items){if(d.querySelector('.bview'))return;
  const at={};items.forEach(it=>{at[it.c|0]=chordName(it.n)});
  const bars=EvoCore.beats.compactBeatRow(d.textContent||'',c=>at[c]);if(!bars.length)return;
  const raw=E('span','braw');while(d.firstChild)raw.append(d.firstChild);
  const v=E('span','bview');
  bars.forEach((bar,i)=>{const b=E('span','bbar');
    bar.forEach(tk=>{const x=E('span',tk.chord?'bc':'bd');x.dataset.t=tk.t;b.append(x)});
    const bl=E('span','bl');bl.dataset.t='|';b.append(bl);v.append(b);if(i<bars.length-1)v.append(document.createElement('wbr'))});
  d.append(raw,v);d.classList.add('bshort')}

/* Keep chord names apart. Measured after layout, again when the font size or the width changes. */
let chordSpaceRaf=0;
function chordSpaceSoon(){cancelAnimationFrame(chordSpaceRaf);chordSpaceRaf=requestAnimationFrame(()=>chordSpace($('#txt')))}
const chordMeasure=document.createElement('canvas').getContext('2d');
function chordLabelWidth(a){const cs=getComputedStyle(a,'::before');
  chordMeasure.font=(cs.fontStyle||'normal')+' '+(cs.fontWeight||'800')+' '+(cs.fontSize||'16px')+' '+(cs.fontFamily||'sans-serif');
  return chordMeasure.measureText(a.dataset.c||'').width}
function chordSpace(t){if(!t)return;
  t.querySelectorAll('.ln.hasch').forEach(line=>{const as=[...line.querySelectorAll('.chd')];as.forEach(a=>{a.style.marginLeft=''});
    let right=-1e9,top=null;
    for(const a of as){let r=a.getBoundingClientRect();
      if(top!==null&&Math.abs(r.top-top)<2&&r.left<right){a.style.marginLeft=(right-r.left).toFixed(1)+'px';r=a.getBoundingClientRect()}
      const gap=parseFloat(getComputedStyle(a,'::before').fontSize||'12')*.45;
      right=r.left+chordLabelWidth(a)+gap;top=r.top}})}
if(window.ResizeObserver){let rw=0,rh=0;new ResizeObserver(es=>{const r=es[0].contentRect;if(Math.abs(r.width-rw)>1||Math.abs(r.height-rh)>1){rw=r.width;rh=r.height;chordSpaceSoon()}}).observe($('#txt'))}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(chordSpaceSoon);
