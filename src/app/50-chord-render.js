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
/* the same transpose as the editor (EvoCore.chord.transposeTo), here for display only */
function chordName(n){const t=chordTp();if(!t)return String(n||'');
  const k=(cur&&EvoCore.chord.normKey(cur.key))||(cur&&cur.chords&&cur.chords[0]&&cur.chords[0].n)||'C';
  return EvoCore.chord.transposeTo(String(n||''),t,EvoCore.chord.transposeKey(k,t))}

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
/* Keep chord names apart without breaking words. Per visual row: each name starts at its letter, then a name that
   would overlap the one before it moves right; if that pushes names past the right edge, they move back left
   (names may then sit a little before their letter). The label moves (--dx), the text stays: "beri" stays "beri"
   under "D#m G#m". Only a row with more names than fit above it gets space pushed into the text, as before. */
function chordSpace(t){if(!t)return;const tr=t.getBoundingClientRect();
  t.querySelectorAll('.ln.hasch').forEach(line=>{const as=[...line.querySelectorAll('.chd')];as.forEach(a=>{a.style.marginLeft='';a.style.removeProperty('--dx')});
    if(!as.length)return;const fs=parseFloat(getComputedStyle(as[0],'::before').fontSize||'12'),gap=fs*.45,minL=tr.left+fs*.2,maxR=tr.right-fs*.2;
    const rows=[];as.forEach(a=>{const r=a.getBoundingClientRect(),row=rows[rows.length-1];
      const it={a,x:r.left,w:chordLabelWidth(a)};if(row&&Math.abs(row.top-r.top)<2)row.items.push(it);else rows.push({top:r.top,items:[it]})});
    rows.forEach(({items})=>{const pos=items.map(it=>it.x);
      for(let k=1;k<items.length;k++)pos[k]=Math.max(pos[k],pos[k-1]+items[k-1].w+gap);
      const n=items.length-1;if(pos[n]+items[n].w>maxR){pos[n]=maxR-items[n].w;for(let k=n-1;k>=0;k--)pos[k]=Math.min(pos[k],pos[k+1]-gap-items[k].w)}
      if(pos[0]<minL){ // too many names for the space above this row: push the text apart instead
        let right=-1e9;items.forEach(it=>{let x=it.a.getBoundingClientRect().left;if(x<right){it.a.style.marginLeft=(right-x).toFixed(1)+'px';x=it.a.getBoundingClientRect().left}right=x+it.w+gap});return}
      items.forEach((it,k)=>{const dx=pos[k]-it.x;if(Math.abs(dx)>0.5)it.a.style.setProperty('--dx',dx.toFixed(1)+'px')})})})}
if(window.ResizeObserver){let rw=0,rh=0;new ResizeObserver(es=>{const r=es[0].contentRect;if(Math.abs(r.width-rw)>1||Math.abs(r.height-rh)>1){rw=r.width;rh=r.height;chordSpaceSoon()}}).observe($('#txt'))}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(chordSpaceSoon);
