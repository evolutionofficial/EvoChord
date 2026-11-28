/* ===== EvoChord: smart editing (file 59) =====
   "Per section" (#eLk, saved in localStorage 'evo.linkSections', on by default): a chord set in one section is also set in
   the sections of the same kind (twins, EvoCore.smart). A chord that differs from its twins is "different": chs.map keeps it
   as '*Name' (o:1 in ed.chords). "Follow again" (.chfollow) makes it match its twins again.
   Chords move with ◀ ▶ (one box) and ⇤ ⇥ (whole line), by holding the button or by dragging the chord.
   The rules are pure (EvoCore.smart); this file applies them to the grid. Wraps oeLoad, chBuild, chSelect and chKbState,
   redeclares chNow and replaces chSet (by name, so the keyboard and the grid keep working as in 52/55). */

function oeLinked(){try{return localStorage.getItem('evo.linkSections')!=='0'}catch(e){return true}}

// chs.map values are 'Name', or '*Name' for a "different" chord. chNow gives {l,c,n} and o:1 for those.
function chNow(){return Object.keys(chs.map).map(k=>{const p=k.split(':'),v=String(chs.map[k]),o=v[0]==='*';
  return o?{l:+p[0],c:+p[1],n:v.slice(1),o:1}:{l:+p[0],c:+p[1],n:v}}).sort((a,b)=>a.l-b.l||a.c-b.c)}

// Signature of a map, to tell whether a step changed anything.
const chSig=m=>Object.keys(m).sort().map(k=>k+'='+m[k]).join('|');

// After oeLoad (the song's chords): the '*' marks come from ed.chords.
oeLoad=(function(orig){return function(){orig.apply(this,arguments);
  chs.map={};(ed.chords||[]).forEach(it=>{if(it&&it.n)chs.map[it.l+':'+it.c]=(it.o?'*':'')+String(it.n)})}})(oeLoad);

// After the grid is drawn: the boxes show the name without '*' ('ov' = different), and chs.at finds a box by l:c.
chBuild=(function(orig){return function(){orig.apply(this,arguments);
  chs.at={};chs.cells.forEach((x,i)=>{const k=x.l+':'+x.c,v=chs.map[k]||'',o=v[0]==='*';chs.at[k]=i;
    x.nEl.textContent=o?v.slice(1):v;x.nEl.classList.toggle('ov',o)})}})(chBuild);

// chs.buf is always the name without '*'.
chSelect=(function(orig){return function(i){orig.apply(this,arguments);
  if(chs&&chs.buf&&chs.buf[0]==='*'){chs.buf=chs.buf.slice(1);chKbState()}}})(chSelect);

chKbState=(function(orig){return function(){if(!chs)return orig.apply(this,arguments);
  if(chs.buf&&chs.buf[0]==='*')chs.buf=chs.buf.slice(1);
  orig.apply(this,arguments);chMoveUI()}})(chKbState);

// Put a chords array back into the grid. Changed boxes are updated in place; only a missing box rebuilds the grid.
// keepL/keepC: the box to keep selected (default: the selected box). Every change is one undo step (oeSnap; none while oe.busy).
function oeApply(chords,keepL,keepC){if(!chs)return;
  const cur=chs.sel>=0&&chs.cells[chs.sel],pl=keepL!=null?keepL:(cur?cur.l:null),pc=keepC!=null?keepC:(cur?cur.c:null);
  const nm={};(chords||[]).forEach(x=>{if(x&&x.n)nm[x.l+':'+x.c]=(x.o?'*':'')+String(x.n)});
  const diff=[...new Set([...Object.keys(chs.map),...Object.keys(nm)])].filter(k=>(chs.map[k]||'')!==(nm[k]||''));
  const missing=diff.some(k=>nm[k]&&!(chs.at&&chs.at[k]!=null&&chs.cells[chs.at[k]]));
  chs.map=nm;
  if(missing)chBuild(null);
  else diff.forEach(k=>{const i=chs.at&&chs.at[k];if(i==null)return;const x=chs.cells[i],v=nm[k]||'',o=v[0]==='*';
    x.nEl.textContent=o?v.slice(1):v;x.nEl.classList.toggle('ov',o)});
  const i=pl!=null?chs.cells.findIndex(x=>x.l===pl&&x.c===pc):-1;
  if(i>=0)chSelect(i);else chSelect(-1);
  chKbState();oeSnap()}

// Set (or with '' delete) the chord of the selected box.
function chSet(n){const x=chs&&chs.cells[chs.sel];if(!x)return;
  const chords=EvoCore.smart.setChord(chs.lines,chNow(),x.l,x.c,n||'',{linked:oeLinked()});
  oeApply(chords,x.l,x.c);chs.buf=n||'';chKbState()}

// ---- moving chords ----
function chMaxC(l){return chs.cells.filter(x=>x.l===l).length*2}   // character columns of the row (2 per box)

// One step for a hold or a tap. st = {l,c,row,dir}; st.c follows the chord. Returns true when something moved.
function chMvOnce(st){
  const before=chSig(chs.map);
  if(st.row){
    const chords=EvoCore.smart.moveRow(chs.lines,chNow(),st.l,st.dir,{linked:oeLinked(),maxC:chMaxC(st.l)});
    const nm={};chords.forEach(x=>{nm[x.l+':'+x.c]=(x.o?'*':'')+x.n});
    const name=chs.map[st.l+':'+st.c],far=st.c+2*st.dir;
    if(name&&nm[st.l+':'+far]===name)st.c=far;   // the selected chord went one box on
    oeApply(chords,st.l,st.c);
    return chSig(nm)!==before}
  const r=EvoCore.smart.moveChord(chs.lines,chNow(),st.l,st.c,st.dir,{linked:oeLinked(),maxC:chMaxC(st.l)});
  oeApply(r.chords,st.l,r.c);st.c=r.c;
  return chSig(chs.map)!==before}

let chMvHold=null;
// Press on a move button: one step now; holding repeats it (after 400 ms, every 120 ms) and the whole hold is one undo step.
function chMvPress(e){const b=e.target.closest&&e.target.closest('button[data-mv],button[data-mr]');
  if(!b||b.disabled||!chs||chs.sel<0||chMvHold)return;
  const x=chs.cells[chs.sel],st={l:x.l,c:x.c,row:!!b.dataset.mr,dir:+(b.dataset.mv||b.dataset.mr)};
  oe.busy=1;chMvHold={st,b,t:0};
  const loop=()=>{if(chMvHold&&chMvOnce(st))chMvHold.t=setTimeout(loop,120)};
  chMvOnce(st);
  chMvHold.t=setTimeout(loop,400);
  document.addEventListener('pointerup',chMvEnd);document.addEventListener('pointercancel',chMvEnd);b.addEventListener('pointerleave',chMvEnd)}
function chMvEnd(){const h=chMvHold;if(!h)return;chMvHold=null;clearTimeout(h.t);
  document.removeEventListener('pointerup',chMvEnd);document.removeEventListener('pointercancel',chMvEnd);h.b.removeEventListener('pointerleave',chMvEnd);
  oe.busy=0;oeSnap()}

// Drag: pointerdown on a chord, then a move of more than 8 px sideways. Each move steps the chord toward the box under the pointer.
let chDrag=null;
function chDragDown(e){const n=e.target.closest&&e.target.closest('.chn');if(!n||!chs||e.button>0||chMvHold)return;
  const cell=n.closest('.chc'),x=cell&&chs.cells[+cell.dataset.i];if(!x||!chs.map[x.l+':'+x.c])return;
  chDrag={id:e.pointerId,x0:e.clientX,l:x.l,c:x.c,on:0};
  document.addEventListener('pointermove',chDragMove);document.addEventListener('pointerup',chDragEnd);document.addEventListener('pointercancel',chDragEnd)}
function chDragMove(e){const d=chDrag;if(!d||(e.pointerId!=null&&e.pointerId!==d.id))return;
  if(!d.on){if(Math.abs(e.clientX-d.x0)<=8)return;d.on=1;oe.busy=1}
  const el=document.elementFromPoint(e.clientX,e.clientY),cell=el&&el.closest&&el.closest('.chc');if(!cell)return;
  const tx=chs.cells[+cell.dataset.i];if(!tx||tx.l!==d.l||tx.c===d.c)return;
  const dir=tx.c>d.c?1:-1;let g=0;
  while(d.c!==tx.c&&g++<100){const r=EvoCore.smart.moveChord(chs.lines,chNow(),d.l,d.c,dir,{linked:oeLinked(),maxC:chMaxC(d.l)});
    if(r.c===d.c)break;d.c=r.c;oeApply(r.chords,d.l,d.c)}}
function chDragEnd(e){const d=chDrag;if(!d||(e&&e.pointerId!=null&&e.pointerId!==d.id))return;chDrag=null;
  document.removeEventListener('pointermove',chDragMove);document.removeEventListener('pointerup',chDragEnd);document.removeEventListener('pointercancel',chDragEnd);
  if(!d.on)return;oe.busy=0;oeSnap();
  // a drag is not a tap: swallow the click that may follow it
  const sw=ev=>{ev.stopPropagation();ev.preventDefault()};document.addEventListener('click',sw,true);setTimeout(()=>document.removeEventListener('click',sw,true),0)}

// The chord keyboard's move row and "Follow again" button. Created once; their state follows the selected box.
function chMoveUI(){const k=$('#chkb');if(!k||!chs)return;
  let mv=k.querySelector('.chmove');
  if(!mv){mv=E('div','chmove');mv.append(E('span','chmvl',L('Move','Geser')));
    [['mv','-1','◀',L('Move chord left','Geser chord ke kiri')],['mv','1','▶',L('Move chord right','Geser chord ke kanan')],
     ['mr','-1','⇤',L('Move the whole line left','Geser semua chord di baris ke kiri')],['mr','1','⇥',L('Move the whole line right','Geser semua chord di baris ke kanan')]]
      .forEach(([a,v,t,aria])=>{const b=E('button','',t);b.type='button';b.dataset[a]=v;b.setAttribute('aria-label',aria);mv.append(b)});
    mv.addEventListener('click',e=>e.stopPropagation());
    k.prepend(mv)}
  const x=chs.sel>=0?chs.cells[chs.sel]:null,v=(x&&chs.map[x.l+':'+x.c])||'';
  const rowHas=!!x&&chNow().some(y=>y.l===x.l);
  mv.querySelectorAll('[data-mv]').forEach(b=>{b.disabled=!v});
  mv.querySelectorAll('[data-mr]').forEach(b=>{b.disabled=!rowHas});
  let f=k.querySelector('.chfollow');
  if(!f){f=E('button','chfollow',L('Follow again','Ikuti lagi'));f.type='button';
    f.addEventListener('click',e=>{e.stopPropagation();const s=chs.cells[chs.sel];if(!s)return;
      oeApply(EvoCore.smart.followAgain(chs.lines,chNow(),s.l,s.c),s.l,s.c)});
    k.querySelector('.chcur').after(f)}
  f.hidden=!(v&&v[0]==='*')}

// Toolbar switch "Per section" (#eLk), after #eCt (or #eN).
(function(){const after=$('#eCt')||$('#eN');if(!after||$('#eLk'))return;
  const b=E('button','');b.id='eLk';b.type='button';b.setAttribute('aria-label',L('Per section','Per bagian'));b.title=L('Per section: an edit goes to every section of the same kind','Per bagian: edit berlaku ke semua bagian sejenis');
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';
  const paint=()=>{const on=oeLinked();b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')};
  b.onclick=()=>{try{localStorage.setItem('evo.linkSections',oeLinked()?'0':'1')}catch(e){}paint()};
  paint();after.after(b)})();

$('#chtx').addEventListener('pointerdown',chDragDown);
$('#chkb').addEventListener('pointerdown',chMvPress);

/* The key is part of the undo history (the editor's transpose changes it): a key picked by hand is its own step,
   together with the chords it moved (oeKeyChanged, 60). */
$('#ek').addEventListener('change',()=>{if(typeof oe==='object'&&oe&&chs){oeKeyChanged();oeSnap()}});
