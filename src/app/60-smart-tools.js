/* ===== EvoChord: smart tools (file 60) =====
   Long press on a chord button (family row, recent chords, a root letter) opens its variants; the toolbar has
   "Pattern" (fill a progression into a section) and "♯♭" (transpose the song or a section, one undo step);
   changing one chord from A to B offers to change every A in the song. The rules are in EvoCore.smart; this file
   puts them on the grid. Wraps chSelect, chMvOnce, chDragMove and oeStart by assignment (59 and 55 keep working). */

const smKey=()=>{const v=$('#ek').value;return v==='__sep'||v==='__chord'?'':v};

// ---- 1. variants on long press ----
let smLp=null,smPop=null,smRp=null,smRpBar=null,smRpT=0;

function smLpTarget(t){const b=t&&t.closest&&t.closest('#chkb button');if(!b||b.disabled)return null;
  if(b.closest('.chfam,.chrec'))return{btn:b,name:b.dataset.r||b.textContent};
  if(/^[A-G]$/.test(b.dataset.k||''))return{btn:b,name:b.dataset.k};
  return null}
function smLpClose(){if(smPop)smPop.remove();smPop=null;document.removeEventListener('pointerdown',smLpOutside,true)}
function smLpOutside(e){if(smPop&&!smPop.contains(e.target))smLpClose()}
function smLpOpen(name,btn){smLpClose();const k=$('#chkb');if(!k)return;
  const pop=E('div','chvar');pop.setAttribute('role','group');pop.setAttribute('aria-label',L('Chord variants','Variasi chord'));
  EvoCore.smart.variants(name,smKey()).forEach(v=>{const b=E('button','',v);b.type='button';b.dataset.v=v;
    b.onclick=()=>{smLpClose();if(!chs||chs.sel<0)return;chSet(v);chSelect(Math.min(chs.sel+1,chs.cells.length-1))};pop.append(b)});
  pop.addEventListener('click',e=>e.stopPropagation());
  const kr=k.querySelector('.kr');if(kr)kr.before(pop);else k.append(pop);
  smPop=pop;document.addEventListener('pointerdown',smLpOutside,true)}

// A press on a chord button starts a timer; 450 ms and still held = variants. The click that follows the release is swallowed.
document.addEventListener('pointerdown',e=>{smLp=null;
  const t=e.target;if(t&&t.closest&&t.closest('#chkb .chfollow'))smRp=null},true);
$('#chkb').addEventListener('pointerdown',e=>{
  if(!chs||chs.sel<0)return;
  const h=smLpTarget(e.target);if(!h)return;
  const s={btn:h.btn,name:h.name,x:e.clientX,y:e.clientY,fired:false,t:0};smLp=s;
  s.t=setTimeout(()=>{if(smLp!==s||!chs||chs.sel<0)return;s.fired=true;smLpOpen(s.name,s.btn)},450)});
document.addEventListener('pointermove',e=>{const s=smLp;if(!s||s.fired||e.clientX==null)return;
  if(Math.hypot(e.clientX-s.x,e.clientY-s.y)>10){clearTimeout(s.t);smLp=null}});
const smLpUp=()=>{const s=smLp;if(!s)return;clearTimeout(s.t);if(!s.fired){smLp=null;return}
  setTimeout(()=>{if(smLp===s)smLp=null},500)};
document.addEventListener('pointerup',smLpUp);document.addEventListener('pointercancel',smLpUp);
document.addEventListener('click',e=>{const s=smLp;
  if(s&&s.fired&&s.btn.contains(e.target)){e.stopPropagation();e.preventDefault();smLp=null}},true);

// ---- 2. "change every one like it" ----
const smName=(l,c)=>String((chs&&chs.map[l+':'+c])||'').replace(/^\*/,'');
function smRpHide(){clearTimeout(smRpT);if(smRpBar)smRpBar.remove();smRpBar=null}
function smRpShow(A,B){smRpHide();if(!chs)return;const n=EvoCore.smart.countNamed(chNow(),A);if(n<1)return;
  const bar=E('div','chrall'),t=E('span','',L(`Change every ${A} to ${B}? (${n})`,`Ganti semua ${A} jadi ${B}? (${n})`));
  const go=E('button','ok',L('Change','Ganti')),x=E('button','','✕');go.type='button';x.type='button';x.setAttribute('aria-label',L('Close','Tutup'));
  go.onclick=()=>{smRpHide();if(!chs)return;oeApply(EvoCore.smart.replaceAll(chNow(),A,B))};
  x.onclick=smRpHide;bar.append(t,go,x);
  const k=$('#chkb');if(k&&!k.hidden)k.before(bar);else $('#edit').append(bar);
  smRpBar=bar;smRpT=setTimeout(smRpHide,6000)}
// The box being left: its name at selection (A) against its name now (B). Moves, follow-again and patterns clear smRp first.
function smRpLeave(){const s=smRp;smRp=null;if(!s||!chs)return;
  const B=smName(s.l,s.c),A=s.name;if(!A||!B||A===B)return;smRpShow(A,B)}

// ---- 3. Pattern button ----
function smPatBtn(){const b=$('#ePt');if(!b)return;const on=!!(chs&&chs.sel>=0);b.classList.toggle('off',!on);b.setAttribute('aria-disabled',on?'false':'true')}

function smPattern(){
  if(!chs||chs.sel<0){note(L('Pick a box in the section first','Pilih kotak di bagian itu dulu'),true);return}
  const x=chs.cells[chs.sel],l=x.l,c=x.c;
  let lb='';for(let k=l;k>=0;k--){const m=/^\s*\[([^\]]+)\]\s*$/.exec(chs.lines[k]||'');if(m){lb=m[1];break}}
  const sh=csh(),inp=E('input','smin');inp.type='text';inp.placeholder='G - D - Em - C';inp.setAttribute('autocapitalize','characters');inp.setAttribute('spellcheck','false');
  sh.append(E('h3','',L('Fill a progression','Isi progresi')),inp);
  let per=2;const seg=E('div','smseg');
  [1,2,4].forEach(n=>{const b=E('button',n===per?'on':'',String(n));b.type='button';b.dataset.pl=String(n);
    b.setAttribute('aria-label',n+' '+L('per line','per baris'));
    b.onclick=()=>{per=n;[...seg.children].forEach(q=>q.classList.toggle('on',q===b))};seg.append(b)});
  sh.append(E('p','mut',L('Chords per line','Chord per baris')),seg);
  sh.append(E('p','mut',L('Section: ','Bagian: ')+(lb||L('this part','bagian ini'))));
  if(oeLinked())sh.append(E('p','mut',L('Also into the other sections of this kind','Juga ke bagian lain yang sejenis')));
  const go=E('button','ok',L('Fill','Isi'));go.type='button';
  const run=()=>{const pat=inp.value.split(/[\s,–—-]+/).filter(t=>EvoCore.chord.isChord(t));
    if(!pat.length){note(L('Type chords, e.g. G - D - Em - C','Ketik chord, misalnya G - D - Em - C'),true);return}
    if(!chs)return;smRp=null;
    oeApply(EvoCore.smart.fillPattern(chs.lines,chNow(),l,pat,{perRow:per,linked:oeLinked()}),l,c);ctxClose()};
  go.onclick=run;inp.addEventListener('keydown',e=>{if(e.key==='Enter')run()});
  const cx=E('button','',L('Cancel','Batal'));cx.type='button';cx.onclick=ctxClose;
  sh.append(go,cx);$('#ctx').classList.add('on');inp.focus()}

// ---- 4. Transpose button ----
function smTranspose(){
  if(!chs)return;
  const sel=chs.sel>=0?chs.cells[chs.sel]:null;
  const base=EvoCore.chord.normKey(smKey())||(chNow()[0]&&chNow()[0].n)||'C';
  const st={semis:0,scope:'whole'};
  const sh=csh();sh.append(E('h3','',L('Transpose chords','Transpose chord')));
  const row=E('div','smtp'),dn=E('button','','−'),up=E('button','','+'),val=E('span','smv','0');
  dn.type='button';up.type='button';dn.dataset.tp='-1';up.dataset.tp='1';
  dn.setAttribute('aria-label',L('Down a semitone','Turun setengah nada'));up.setAttribute('aria-label',L('Up a semitone','Naik setengah nada'));
  const ks=E('select','smks');ks.setAttribute('aria-label',L('Target key','Nada tujuan'));
  for(let s=-5;s<=6;s++){const o=E('option','',EvoCore.chord.transposeKey(base,s));o.value=String(s);ks.append(o)}
  const seg=E('div','smseg'),sB=E('button','on',L('Whole song','Seluruh lagu')),sS=E('button','',L('This section','Bagian ini'));
  sB.type='button';sS.type='button';sB.dataset.sc='whole';sS.dataset.sc='section';sS.disabled=!sel;
  seg.append(sB,sS);
  const hint=E('p','mut',''),prev=E('p','mut',''),go=E('button','ok',L('Apply','Terapkan')),cx=E('button','',L('Cancel','Batal'));
  go.type='button';cx.type='button';cx.onclick=ctxClose;
  const lineNow=()=>(st.scope==='section'&&sel?sel.l:null);
  function paint(){
    const off=((st.semis%12)+12)%12;ks.value=String(off>6?off-12:off);
    val.textContent=st.semis>0?'+'+st.semis:st.semis<0?'−'+(-st.semis):'0';
    sB.classList.toggle('on',st.scope==='whole');sS.classList.toggle('on',st.scope==='section');
    hint.textContent=st.scope==='section'&&oeLinked()?L('Also the same kind of sections, except chords marked different','Juga bagian sejenis, kecuali chord yang ditandai berbeda'):'';
    const cur=chNow(),r=EvoCore.smart.transposeChords(chs.lines,cur,st.semis,{key:EvoCore.chord.normKey(smKey()),line:lineNow(),linked:oeLinked()}),seen=new Map();
    cur.forEach((x,i)=>{const y=r.chords[i];if(y&&y.n!==x.n&&!seen.has(x.n))seen.set(x.n,y.n)});
    const pairs=[...seen].map(([a,b])=>a+' → '+b);
    prev.textContent=pairs.length?pairs.slice(0,6).join(', ')+(pairs.length>6?' …':''):'—'}
  dn.onclick=()=>{st.semis=Math.max(-11,st.semis-1);paint()};
  up.onclick=()=>{st.semis=Math.min(11,st.semis+1);paint()};
  ks.onchange=()=>{st.semis=+ks.value;paint()};
  sB.onclick=()=>{st.scope='whole';paint()};
  sS.onclick=()=>{if(!sel)return;st.scope='section';paint()};
  go.onclick=()=>{
    if(!chs||!st.semis){ctxClose();return}
    smRp=null;const line=lineNow();
    if(line!=null){
      const r=EvoCore.smart.transposeChords(chs.lines,chNow(),st.semis,{key:EvoCore.chord.normKey(smKey()),line,linked:oeLinked()});
      oe.tpBase=null;oeApply(r.chords);ed.dirty=true;
    }else{
      // whole song: the same result as a fresh transpose, but transposing back to the start gives the exact original names
      const cj=JSON.stringify(chNow()),tb=oe.tpBase;let bc,bk,tot;
      if(tb&&cj===tb.last){bc=JSON.parse(tb.chords);bk=tb.key;tot=tb.total+st.semis}
      else{bc=chNow();bk=EvoCore.chord.normKey(smKey());tot=st.semis}
      const r=EvoCore.smart.transposeChords(chs.lines,bc,tot,{key:bk});
      const base0=JSON.stringify(bc);
      if(r.key){const want=EvoCore.chord.normKey(r.key),o=[...$('#ek').options].find(q=>EvoCore.chord.normKey(q.value)===want);if(o)$('#ek').value=o.value}
      oeApply(r.chords);
      oe.tpBase={chords:base0,key:bk,total:tot,last:JSON.stringify(chNow())};ed.dirty=true}
    ctxClose()};
  row.append(dn,val,up);
  sh.append(row,ks,seg,hint,prev,go,cx);paint();$('#ctx').classList.add('on')}

// ---- toolbar: Pattern and ♯♭ after "Per section" ----
(function(){const after=$('#eLk');if(!after||$('#ePt'))return;
  const pt=E('button','');pt.id='ePt';pt.type='button';pt.setAttribute('aria-label',L('Pattern','Pola'));pt.title=L('Fill a chord progression','Isi progresi chord');
  pt.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
  pt.onclick=()=>{if(!chs||chs.sel<0){note(L('Pick a box in the section first','Pilih kotak di bagian itu dulu'),true);return}smPattern()};
  const tp=E('button','','♯♭');tp.id='eTp';tp.type='button';tp.setAttribute('aria-label',L('Transpose','Transpose'));tp.title=L('Transpose the chords','Transpose chord');
  tp.onclick=()=>{if(chs)smTranspose()};
  after.after(pt);pt.after(tp);smPatBtn()})();

// ---- wrappers (by assignment, like 59) ----
chSelect=(function(orig){return function(i){
  const t=(chs&&i>=0&&chs.cells[i])||null;
  if(!(t&&smRp&&t.l===smRp.l&&t.c===smRp.c)){smRpLeave();smRp=t?{l:t.l,c:t.c,name:smName(t.l,t.c)}:null}
  if(i<0)smLpClose();
  smPatBtn();
  return orig.apply(this,arguments)}})(chSelect);

chMvOnce=(function(orig){return function(st){smRp=null;return orig.apply(this,arguments)}})(chMvOnce);

chDragMove=(function(orig){return function(e){const d=chDrag;
  if(d&&(d.on||(e&&e.clientX!=null&&Math.abs(e.clientX-d.x0)>8)))smRp=null;
  return orig.apply(this,arguments)}})(chDragMove);

oeStart=(function(orig){return function(){smRp=null;smRpHide();smLpClose();orig.apply(this,arguments);if(oe)oe.tpBase=null}})(oeStart);

/* The key as anchor: once a song has its key, picking another key in the editor moves every chord with it
   (C → D: C becomes D, Am becomes Bm). Setting the first key, or switching between a key and its relative
   (C ↔ Am), only names the key. Same transpose as the ♯♭ sheet and the song screen; back to the old key gives the
   exact old names. Called by the #ek change listener (59) before it takes the undo step, so key + chords are one step. */
function oeKeyChanged(){if(!chs||!oe)return;
  let prev='';try{prev=JSON.parse(oe.undo[oe.ui]).key||''}catch(e){}
  const C=EvoCore.chord,a=C.normKey(prev),b=C.normKey($('#ek').value),pa=C.parseChord(a),pb=C.parseChord(b);
  if(!pa||!pb||!chNow().length)return;
  const minor=p=>/^m(?!aj)/.test(p.quality);if(minor(pa)!==minor(pb))return;
  let s=((C.pitchClass(pb.root+pb.acc)-C.pitchClass(pa.root+pa.acc))%12+12)%12;if(s>6)s-=12;if(!s)return;
  const cj=JSON.stringify(chNow()),kb=oe.keyBase;let chords;
  if(kb&&kb.last===cj){kb.total+=s;chords=kb.total%12?kb.chords.map(x=>({...x,n:C.transposeTo(x.n,kb.total,b)})):kb.chords.map(x=>({...x}))}
  else{const base=JSON.parse(cj);oe.keyBase={chords:base,total:s};chords=base.map(x=>({...x,n:C.transposeTo(x.n,s,b)}))}
  oe.busy=1;try{oeApply(chords)}finally{oe.busy=0}
  oe.keyBase.last=JSON.stringify(chNow());oe.tpBase=null;
  note(L(`Chords moved to ${b}.`,`Chord dipindah ke ${b}.`))}
oeStart=(function(orig){return function(){orig.apply(this,arguments);if(oe)oe.keyBase=null}})(oeStart);
