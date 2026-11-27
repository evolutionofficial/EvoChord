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
function chordFlats(){const k=(cur&&cur.key)||(cur&&cur.chords&&cur.chords[0]&&cur.chords[0].n)||'C';
  return EvoCore.chord.prefersFlats(EvoCore.chord.transposeKey(k,chordTp()))}
function chordName(n){const t=chordTp();return t?EvoCore.chord.transposeChord(String(n||''),t,{flats:chordFlats()}):String(n||'')}

function chordApply(le,items){if(!le)return;
  le.forEach(d=>{if(d&&d.classList&&d.classList.contains('ln')&&EvoCore.beats.isBeatLine(d.textContent))d.classList.add('beat')});
  if(!items||!items.length)return;const by={};items.forEach(it=>{(by[it.l]=by[it.l]||[]).push(it)});
  Object.keys(by).forEach(l=>{const d=le[+l];if(!d||!d.classList||!d.classList.contains('ln'))return;const len=(d.textContent||'').length;if(!len)return;
    by[l].slice().sort((a,b)=>b.c-a.c).forEach(it=>{const c=Math.max(0,Math.min(it.c|0,len-1)),nodes=chNodes(d);
      for(const[nd,o]of nodes){if(c>=o&&c<o+nd.data.length){const a=E('span','chd');a.dataset.c=chordName(it.n);const r=nd.splitText(c-o);r.parentNode.insertBefore(a,r);break}}});
    d.classList.add('hasch')});
  le.forEach(d=>{if(d&&d.classList&&d.classList.contains('beat'))chordBarBreaks(d)});
  chordSpaceSoon()}
/* A beat row only wraps between bars, so a bar is never split over two lines: each bar goes in a
   no-wrap span with a <wbr> between bars. Only text and chord anchors are moved, never text changed,
   so offsets (chords, highlights) stay the same. Rows with other markup inside are left as they are. */
function chordBarBreaks(d){if([...d.childNodes].some(n=>n.nodeType===1&&!n.classList.contains('chd')))return;
  [...d.childNodes].forEach(nd=>{if(nd.nodeType!==3)return;let i;if(nd.data.length>1&&nd.data[0]==='|'&&nd.previousSibling)nd=nd.splitText(1);while((i=nd.data.indexOf('|',1))>0&&i<nd.data.length-1)nd=nd.splitText(i+1)});
  const kids=[...d.childNodes];let bar=null;
  kids.forEach(n=>{if(!bar){bar=E('span','bar');d.insertBefore(bar,n)}bar.appendChild(n);
    if(n.nodeType===3&&/\|$/.test(n.data)&&n!==kids[kids.length-1]){bar.after(document.createElement('wbr'));bar=null}});}

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
