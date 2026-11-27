/* ---------- Edit ---------- */
/* v104: the Section panel = three collapsible categories (the only label list; SECS is derived from it). Older markers in saved lyrics (Sing Along, Free Style, Medley, Rit, Rall…) still work: LC keeps their colours and SEC_OLD keeps them "standard". */
const SEC_GROUPS=[['Song',['Intro','Verse','Pre-Chorus','Chorus','Post-Chorus','Interlude','Instrumental','Solo','Bridge','Rap','Drop','Coda','Outro']],
  ['Voicing',['Vocal 1','Vocal 2','Vocal 3','Vocal 4','Vocal 5','Harmony','Choir']],
  ['Performance',['A Cappella','Sing-Along','Call & Response','Ad-Libs','Improvisation','Scat','Whistle','Scream','Whisper','Spoken','Break','Rit.','Rall.']]];
const SECS=SEC_GROUPS.flatMap(g=>g[1]),SEC_OLD=['Sing Along','Free Style','Medley','Rit','Rall'];
const CHEV='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
SEC_GROUPS.forEach(([g,list],gi)=>{
  const w=E('div','scw'),h=E('button','sch'),body=E('div','scg');body.id='scg'+gi;
  h.type='button';h.setAttribute('aria-expanded',gi?'false':'true');h.setAttribute('aria-controls',body.id);h.append(E('span','',g));h.insertAdjacentHTML('beforeend',CHEV);
  h.onclick=()=>{const open=w.classList.contains('shut'); /* accordion: opening one closes the others */
    document.querySelectorAll('#side .scw').forEach(x=>{const o=x===w?open:false;x.classList.toggle('shut',!o);x.querySelector('.sch').setAttribute('aria-expanded',o?'true':'false')})};
  body.setAttribute('data-nt','');
  list.forEach(n=>{const b=E('button','',n);tc(b,LC[n.toLowerCase()]||LC[n.toLowerCase().replace(/\s*\d+$/,'')]||'#a8a29e');b.onclick=()=>ins(n);body.append(b)});
  if(gi)w.classList.add('shut'); /* default: only SONG is open */
  w.append(h,body);$('#side').append(w)});
/* drawer: hide / show the whole Section panel (remembered) */
const sideSet=on=>{$('#edit').classList.toggle('noside',!on);const b=$('#eSd');b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');b.setAttribute('aria-label',on?'Hide section panel':'Show section panel');try{localStorage.setItem('evo.side',on?'1':'0')}catch(e){}};
$('#eSd').onclick=()=>sideSet($('#edit').classList.contains('noside'));
/* v144: Auto Section in the editor (library songs are never changed by themselves). Existing labels are replaced after asking; Undo brings them back. */
function edAuto(){const v=ta.value,a=autoSec(v);if(!a)return note('No sections recognised',true);if(a===v)return;
  snap();setLines(a.split('\n'),0)}
{const b=E('button','','Auto Section');b.id='eA';b.type='button';b.setAttribute('data-nt','');$('#side').prepend(b)}
$('#eA').onclick=()=>{if(ta.value.split('\n').some(secLbl))return ask('Auto Section ','Replace the existing section labels? Undo brings them back.','Replace',edAuto);edAuto()};
/* v175: Clear Sections – removes every [label] line from the editor so a song (e.g. from LRCLIB) can be labelled again by hand. Lyrics stay; Undo brings the labels back; nothing is saved until Save. */
function edClear(){const L=ta.value.split('\n'),k=L.filter(l=>!secLbl(l));if(k.length===L.length)return;snap();setLines(k.length?k:[''],0)}
{const b=E('button','','Clear Sections');b.id='eC';b.type='button';$('#eA').after(b)}
$('#eC').onclick=()=>{if(!ta.value.split('\n').some(secLbl))return note('No section labels to clear',true);ask('Clear Sections','Remove all section labels? The lyrics stay. Undo brings them back.','Clear',edClear)};
let sideOn=true;try{sideOn=localStorage.getItem('evo.side')!=='0'}catch(e){}sideSet(sideOn);
const SW=['#ff5d5d','#fb923c','#fbbf24','#4ade80','#2dd4bf','#38bdf8','#4da3ff','#7c83ff','#c084fc','#f472b6'];let swc=SW[0];
function pickSw(c){swc=c;[...$('#sws').children].forEach(b=>b.classList.toggle('on',b.dataset.c===c))}
SW.forEach(c=>{const b=E('button');b.style.background=c;b.dataset.c=c;b.setAttribute('aria-label',c);b.onclick=()=>pickSw(c);$('#sws').append(b)});
const cb=E('button','','Custom…');cb.onclick=()=>{$('#cn').value='';pickSw(SW[0]);$('#cbox').classList.add('on')};$('#side').append(cb);
$('#cok').onclick=()=>{const n=$('#cn').value.replace(/[\[\]]/g,'').trim();if(!n)return;$('#cbox').classList.remove('on');ins(n,swc)};
$('#cbox').onclick=e=>{if(e.target.id==='cbox')$('#cbox').classList.remove('on')};
['','C','D','E','F','G','A','B','C#/Db','D#/Eb','F#/Gb','G#/Ab','A#/Bb'].forEach(k=>{const o=E('option','',k||'Key');o.value=k;$('#ek').append(o)});{const k=$('#ek'),sp=E('option','','──────');sp.disabled=true;sp.value='__sep';const o=E('option','','Chords');o.value='__chord';k.append(sp,o)}
const ta=$('#ta');let st;
/* v71: tempo. speed px/s = (speed+3) x .8 x font x .12 and a lyric line is 1.45 x font high, so
   speed = BPM / (60 x beatsPerLine) x 1.45 / .096 - 3. Tap tempo and a server lookup (/api/tempo) fill the BPM. */
const TEMPO_UI=false; /* v72: tempo UI hidden for now; flip to true to bring it back */
const tmSpeed=(bpm,n)=>Math.max(1,Math.min(25,Math.round((bpm*1.45/.096/60/n-SPEED_BONUS)*10)/10));
function tmLoad(src){$('#etm').hidden=!TEMPO_UI;if(!TEMPO_UI)return;$('#eb').value=src&&src.bpm?src.bpm:'';$('#ebl').value=String(src&&src.bpl||4);$('#ebn').hidden=true;tmTaps=[]}
function tmRead(){const b=Math.round(+$('#eb').value);return{bpm:b>=30&&b<=300?b:0,bpl:+$('#ebl').value||4}}
function tmApply(s,t){if(!TEMPO_UI)return;if(!t.bpm){delete s.bpm;delete s.bpl;return}
  const ch=s.bpm!==t.bpm||s.bpl!==t.bpl;s.bpm=t.bpm;s.bpl=t.bpl;if(ch)s.speed=tmSpeed(t.bpm,t.bpl)}
let tmTaps=[];
$('#ebt').onclick=()=>{const n=performance.now();if(tmTaps.length&&n-tmTaps[tmTaps.length-1]>2000)tmTaps=[];tmTaps.push(n);if(tmTaps.length>9)tmTaps.shift();
  if(tmTaps.length<3){$('#ebn').hidden=false;$('#ebn').textContent='Keep tapping to the beat…';return}
  const bpm=Math.round(60000*(tmTaps.length-1)/(tmTaps[tmTaps.length-1]-tmTaps[0]));
  $('#eb').value=Math.max(30,Math.min(300,bpm));$('#ebn').hidden=false;$('#ebn').textContent=bpm+' BPM (from taps). Save to apply it to the scroll speed.';ed.dirty=true};
$('#ebf').onclick=async()=>{
  const title=$('#et').value.trim()||ta.value.split('\n').find(l=>l.trim()&&!/^\[.+\]$/.test(l.trim()))||'',art=$('#ea').value.trim(),n=$('#ebn'),b=$('#ebf');
  if(!title)return note('Add a song title first',1);
  if(!user)return note('Sign in to look up tempo online. You can still tap or type it.',1);
  if(!navigator.onLine)return note('You are offline. Tap or type the tempo instead.',1);
  b.disabled=true;n.hidden=false;n.textContent='Looking up tempo… (up to 20 s)';
  const fail=m=>{n.textContent=m};
  try{await ensureClient();const{data}=await sb.auth.getSession();const tk=data&&data.session&&data.session.access_token;if(!tk)return fail('Please sign in again.');
    const r=await fetch('/api/tempo?'+new URLSearchParams({title,artist:art}),{headers:{authorization:'Bearer '+tk}});let j={};try{j=await r.json()}catch(e){}
    if(r.ok&&j.bpm){$('#eb').value=j.bpm;ed.dirty=true;n.textContent='';n.append(j.bpm+' BPM'+(j.alt&&j.alt!==j.bpm?' (could also be '+j.alt+')':'')+'. Check it against the song, then save. Tempo by ');const a=E('a','','FreqBlog');a.href='https://freqblog.com';a.target='_blank';a.rel='noopener';n.append(a)}
    else fail(j.error==='not_found'?'Tempo not found for this song. Use Tap or type it.':j.error==='pending'?'Still analysing this song. Try again in a minute.':j.error==='busy'?'Too many lookups right now. Try again shortly.':j.error==='not_configured'?'Tempo lookup is not set up yet. Use Tap or type it.':j.error==='auth'?'Please sign in again.':'Tempo lookup failed. Use Tap or type it.')}
  catch(e){fail('Tempo lookup failed. Use Tap or type it.')}
  finally{b.disabled=false}};
function openEdit(s,txt,title,base,pre){
  exitFs(); /* leave the performance view before editing (it is re-entered when the song reopens) */
  const src=s||base,v=txt!=null?txt:(s?s.lyrics:'');
  const own=s||base;ed={s,base,stops:{...((src&&src.stops)||{})},ann:JSON.parse(JSON.stringify((src&&src.ann)||[])),chords:JSON.parse(JSON.stringify((src&&src.chords)||[])),h:[v],i:0,dirty:!s&&!!(txt||title),arm:0,colors:{...((src&&src.colors)||{})},cats:new Set(own?cats.filter(c=>c.ids.includes(own.id)).map(c=>c.id):(pre||[]))};
  ed.annLyr=v;ed.chLyr=v;$('#et').value=title!=null?title:(s?s.title:'');$('#ea').value=src?src.artist||'':'';$('#ek').value=src?src.key||'':'';$('#ek').dataset.v=$('#ek').value;tmLoad(src);
  $('#eX').classList.remove('arm');$('#hlbar').hidden=true;$('#eH').classList.remove('on');lastSel=null;cs=null;csRender();ta.value=v;setKb(false);catSummary();show('edit');setTimeout(snapCaret,0)}
function snapCaret(){if(ta.inputMode==='none'&&ta.selectionStart===ta.selectionEnd){const p=ta.selectionStart,ls=p?ta.value.lastIndexOf('\n',p-1)+1:0;if(ta.selectionStart!==ls||ta.selectionEnd!==ls)ta.setSelectionRange(ls,ls)}secInfo()}
let dsArm=0;const isLbl=l=>/^\[.+\]$/.test(l.trim());
function secInfo(){
  if(cs&&cs.v!==ta.value){cs=null;csRender()}
  noteInfo();hlSync();
  const L=ta.value.split('\n'),ci=ta.value.slice(0,ta.selectionStart).split('\n').length-1;let a=-1;
  for(let i=Math.min(ci,L.length-1);i>=0;i--)if(isLbl(L[i])){a=i;break}
  const bar=$('#secbar');dsArm=0;$('#ds').textContent='Delete section';$('#ds').classList.remove('warn');
  if(a<0){bar.hidden=true;return null}
  let from=a+1;if(isGen(L[a].trim().slice(1,-1).toLowerCase())){let j=a-1;while(j>=0&&!L[j].trim())j--;if(j>=0&&isLbl(L[j])&&!isGen(L[j].trim().slice(1,-1).toLowerCase()))a=j} /* a voice tag right under a section belongs to that section */
  {let j=a+1;while(j<L.length&&!L[j].trim())j++;if(j<L.length&&isLbl(L[j])&&isGen(L[j].trim().slice(1,-1).toLowerCase())&&!isGen(L[a].trim().slice(1,-1).toLowerCase()))from=j+1}
  let b=L.length;for(let i=from;i<L.length;i++)if(isLbl(L[i])){b=i;break}
  const nm=L[a].trim().slice(1,-1);$('#sn').textContent=nm;stopBtn(nm.toLowerCase());$('#sn').style.color=lblColor({colors:ed&&ed.colors},nm.toLowerCase());bar.hidden=false;return{L,a,b}}
function stopBtn(lo){const b=$('#sstop');b.hidden=!stopEligible(lo);if(b.hidden)return;const on=stopOf(ed,lo);b.textContent=on?'⏸ Pause here':'▶ Keep going';b.title=on?'Auto-scroll pauses at this section':'Auto-scroll keeps going through this section';b.classList.toggle('on',on)}
$('#sstop').onclick=()=>{const x=secInfo();if(!x)return;const lo=x.L[x.a].trim().slice(1,-1).toLowerCase(),want=!stopOf(ed,lo);
  if(want===stopDef(lo))delete ed.stops[lo];else ed.stops[lo]=want?'p':'k';ed.dirty=true;stopBtn(lo)};
function editSec(all){
  const x=secInfo();if(!x)return;snap();const{L,a,b}=x;
  if(all){L.splice(a,b-a);if(a>0&&a<L.length&&!L[a-1].trim()&&!L[a].trim())L.splice(a,1)}else L.splice(a,1);
  ta.value=L.join('\n');const ai=Math.max(0,Math.min(a,L.length-1)),pos=L.slice(0,ai).join('\n').length+(ai>0?1:0);
  ta.setSelectionRange(pos,pos);snap();ed.dirty=true;secInfo()}
$('#rl').onclick=()=>editSec(false);
$('#ds').onclick=()=>{if(!dsArm){dsArm=1;$('#ds').textContent='Confirm delete';$('#ds').classList.add('warn');return}editSec(true)};
ta.addEventListener('input',()=>secInfo());
/* v88: highlights are {c:text} markers in the lyrics (c = r o y g b i v). Tap inside one to change its colour or remove it; no selection needed. */
const HLR=/\{([roygbiv]):([^{}]*)\}/g;
function hlList(v){const out=[];let m;HLR.lastIndex=0;while((m=HLR.exec(v)))out.push({s:m.index,e:m.index+m[0].length,c:m[1],t:m[2]});return out}
function SEL(){return cs&&cs.v===ta.value?[cs.a,cs.b]:[ta.selectionStart,ta.selectionEnd]}
function hlCtx(){const v=ta.value,[p,q]=SEL(),L=hlList(v);
  if(p!==q){const o=L.filter(h=>h.s<q&&h.e>p);return o.length&&o.every(h=>h.c===o[0].c)?o[0]:null}
  const at=L.find(h=>p>=h.s&&p<h.e);if(at)return at;
  const ls=p?v.lastIndexOf('\n',p-1)+1:0;let le=v.indexOf('\n',p);if(le<0)le=v.length;
  const ln=L.filter(h=>h.s>=ls&&h.e<=le);return ln.length===1?ln[0]:null}
const hlWrap=(c,t)=>{const x=t.match(/^(\s*)([\s\S]*?)(\s*)$/);return !c||!x[2]?t:x[1]+'{'+c+':'+x[2]+'}'+x[3]};
function hlApply(c){hlApply0(c);if(ta.inputMode==='none'&&ta.selectionStart!==ta.selectionEnd)csSet(ta.selectionStart,ta.selectionEnd)} /* keep our own selection after colouring */
function hlApply0(c){
  hlAuto=false; /* once you use the bar it stays open until you close it with the highlighter button */
  const v0=ta.value;let[a,b]=SEL();
  if(a===b&&lastSel&&lastSel.v===v0&&(a===lastSel.a||a===lastSel.b)){a=lastSel.a;b=lastSel.b} /* some phones collapse the selection when a button is tapped */
  const L=hlList(v0);let ctx=null;
  ctx=a===b?hlCtx():(L.find(h=>h.s===a&&h.e===b)||null); /* caret in a highlight, or the highlight itself is selected */
  if(ctx){snap();const out=(c&&c!==ctx.c)?hlWrap(c,ctx.t):ctx.t; /* tapping the colour it already has removes it */
      ta.value=v0.slice(0,ctx.s)+out+v0.slice(ctx.e);ta.setSelectionRange(ctx.s,ctx.s+out.length);snap();ed.dirty=true;secInfo();return}
  if(a===b){const ls=a?v0.lastIndexOf('\n',a-1)+1:0;let le=v0.indexOf('\n',a);if(le<0)le=v0.length;if(ls===le||isLbl(v0.slice(ls,le)))return;a=ls;b=le} /* no selection: use the whole line */
  /* a selection inside one highlight: only that part changes, the rest keeps its colour */
  const host=L.find(h=>a>=h.s+3&&b<=h.e-1);
  if(host&&a<b){snap();const i0=a-(host.s+3),i1=b-(host.s+3),pre=host.t.slice(0,i0),mid=host.t.slice(i0,i1),post=host.t.slice(i1);
    const out=hlWrap(host.c,pre)+hlWrap(c,mid)+hlWrap(host.c,post),pos=host.s+hlWrap(host.c,pre).length;
    ta.value=v0.slice(0,host.s)+out+v0.slice(host.e);ta.setSelectionRange(pos,pos+hlWrap(c,mid).length);snap();ed.dirty=true;secInfo();return}
  snap();const v=v0;
  for(const h of L){if(a>h.s&&a<h.e)a=h.s;if(b>h.s&&b<h.e)b=h.e}
  const seg=v.slice(a,b).replace(/\{[roygbiv]:([^{}]*)\}/g,'$1');
  const out=c?seg.split('\n').map(l=>{if(!l.trim()||isLbl(l))return l;return hlWrap(c,l)}).join('\n'):seg;
  ta.value=v.slice(0,a)+out+v.slice(b);ta.setSelectionRange(a,a+out.length);
  snap();ed.dirty=true;secInfo()}
let hlAuto=false;
/* the colour bar opens by itself when the caret is in a highlight, and shows which colour it has */
function hlSync(){const bar=$('#hlbar');if(!bar||!$('#edit').classList.contains('on'))return;const c=hlCtx();
  bar.querySelectorAll('.sw').forEach(x=>{const on=!!c&&x.dataset.c===c.c;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on?'true':'false')});
  if(c&&bar.hidden){bar.hidden=false;hlAuto=true;$('#eH').classList.add('on')}
  else if(!c&&hlAuto&&!bar.hidden){bar.hidden=true;hlAuto=false;$('#eH').classList.remove('on')}}
$('#eH').onclick=()=>{hlAuto=false;$('#hlbar').hidden=!$('#hlbar').hidden;$('#eH').classList.toggle('on',!$('#hlbar').hidden)};

Object.keys(HC).forEach(k=>{const b=E('button','sw');b.type='button';b.dataset.c=k;b.setAttribute('aria-label',HLN[k]);b.style.background=HC[k];b.style.setProperty('--c',HC[k]);b.onclick=()=>hlApply(b.dataset.c);$('#hlbar').insertBefore(b,$('#hx'))});
$('#hx').onclick=()=>{const c=hlCtx();hlApply('')};
['pointerup','keyup','click','focus','select'].forEach(v=>ta.addEventListener(v,()=>setTimeout(snapCaret,0)));
let lastSel=null;document.addEventListener('selectionchange',()=>{if(document.activeElement===ta&&!csBusy){if(ta.selectionStart!==ta.selectionEnd){if(ta.inputMode==='none'){csSet(ta.selectionStart,ta.selectionEnd);return}lastSel={a:ta.selectionStart,b:ta.selectionEnd,v:ta.value}}snapCaret()}});
/* v108: keyboard off = own selection (orange mark + two handles) so the phone's Cut / Copy / Paste / Look Up pop-up never appears; the native selection is collapsed at once.
   Keyboard on = the normal native selection and pop-up. cs = {a,b,v}: the selected range of the lyrics text v. */
let cs=null,csBusy=false,csDrag=null,csTap=null;
const csw=E('div'),csm=E('div'),csi=E('div'),csA=E('div','csh'),csB=E('div','csh');csw.id='csw';csm.id='csm';csw.setAttribute('data-nt','');csm.append(csi);csw.append(csm,csA,csB);ta.parentElement.style.position='relative';ta.parentElement.append(csw);
/* the phone also shows a Paste / Select / AutoFill pop-up for the leftover caret, so the text box is un-focused while our own selection is on screen */
function csBlur(){const f=()=>{if(cs&&ta.inputMode==='none'&&document.activeElement===ta)ta.blur()};f();setTimeout(f,120);setTimeout(f,400)}
function csSet(a,b){cs={a,b,v:ta.value};csBusy=true;try{ta.setSelectionRange(a,a)}catch(e){}csBusy=false;csRender();secInfo();csBlur()}
function csPt(i){const w=document.createTreeWalker(csi,NodeFilter.SHOW_TEXT);let n,o=0,last=null;while(n=w.nextNode()){last=n;if(i<=o+n.data.length)return[n,i-o];o+=n.data.length}return last?[last,last.data.length]:null}
function csRect(i,end){const t=ta.value.length,r=document.createRange();let x=end?csPt(Math.max(0,i-1)):csPt(i),y=end?csPt(i):csPt(Math.min(t,i+1));if(!x||!y)return null;r.setStart(x[0],x[1]);r.setEnd(y[0],y[1]);const q=r.getClientRects();if(!q.length)return null;return end?q[q.length-1]:q[0]}
function csPos(){if(!cs||csw.style.display==='none')return;csi.style.transform='translateY('+(-ta.scrollTop)+'px)';
  const W=csw.getBoundingClientRect(),H=ta.offsetHeight;
  [[csA,csRect(cs.a,false),0],[csB,csRect(cs.b,true),1]].forEach(([h,r,e])=>{if(!r){h.style.display='none';return}const x=(e?r.right:r.left)-W.left,y=r.bottom-W.top;h.style.display=(y<2||y>H-2)?'none':'block';h.style.left=x+'px';h.style.top=(y+2)+'px'})}
function csRender(){
  const ok=cs&&cs.v===ta.value&&ta.inputMode==='none'&&$('#edit').classList.contains('on');
  if(!ok){csw.style.display='none';if(cs&&cs.v!==ta.value)cs=null;return}
  const g=getComputedStyle(ta),bw=['Left','Right','Top','Bottom'].map(k=>parseFloat(g['border'+k+'Width'])||0);
  csw.style.display='block';Object.assign(csw.style,{left:ta.offsetLeft+'px',top:ta.offsetTop+'px',width:ta.offsetWidth+'px',height:ta.offsetHeight+'px'});
  Object.assign(csm.style,{fontFamily:g.fontFamily,fontSize:g.fontSize,fontWeight:g.fontWeight,fontStyle:g.fontStyle,lineHeight:g.lineHeight,letterSpacing:g.letterSpacing,wordSpacing:g.wordSpacing,tabSize:g.tabSize,padding:g.padding,borderStyle:'solid',borderWidth:bw[2]+'px '+bw[1]+'px '+bw[3]+'px '+bw[0]+'px',width:(ta.clientWidth+bw[0]+bw[1])+'px',height:(ta.clientHeight+bw[2]+bw[3])+'px'});
  const t=ta.value,m=E('mark');m.textContent=t.slice(cs.a,cs.b);csi.textContent='';csi.append(document.createTextNode(t.slice(0,cs.a)),m,document.createTextNode(t.slice(cs.b)+'\u200b'));
  csPos()}
function csIdx(x,y){let r=null;if(document.caretRangeFromPoint)r=document.caretRangeFromPoint(x,y);else if(document.caretPositionFromPoint){const q=document.caretPositionFromPoint(x,y);if(q)r={startContainer:q.offsetNode,startOffset:q.offset}}
  if(!r||r.startContainer.nodeType!==3||!csi.contains(r.startContainer))return -1;
  const w=document.createTreeWalker(csi,NodeFilter.SHOW_TEXT);let n,o=0;while(n=w.nextNode()){if(n===r.startContainer)return Math.min(ta.value.length,o+r.startOffset);o+=n.data.length}return -1}
[csA,csB].forEach((h,k)=>{
  h.addEventListener('pointerdown',e=>{if(!cs)return;e.preventDefault();e.stopPropagation();try{h.setPointerCapture(e.pointerId)}catch(_){}csDrag={anchor:k?cs.a:cs.b};csw.classList.add('drag')});
  h.addEventListener('pointermove',e=>{if(!csDrag||!cs)return;const R=ta.getBoundingClientRect();if(e.clientY>R.bottom-28)ta.scrollTop+=12;else if(e.clientY<R.top+28)ta.scrollTop-=12;
    const ix=csIdx(e.clientX,e.clientY-28);if(ix<0)return;const a=Math.min(ix,csDrag.anchor),b=Math.max(ix,csDrag.anchor);if(a===b||(a===cs.a&&b===cs.b))return;cs.a=a;cs.b=b;csRender()});
  const up=()=>{if(!csDrag)return;csDrag=null;csw.classList.remove('drag');secInfo()};h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)});
ta.addEventListener('pointerdown',e=>{csTap={x:e.clientX,y:e.clientY,t:performance.now()}});
ta.addEventListener('pointerup',e=>{if(cs&&csTap&&Math.hypot(e.clientX-csTap.x,e.clientY-csTap.y)<8&&performance.now()-csTap.t<350){cs=null;csRender();secInfo()}else if(cs)csBlur();csTap=null}); /* a short tap clears the selection */
ta.addEventListener('scroll',csPos);window.addEventListener('resize',csRender);if(window.ResizeObserver)new ResizeObserver(()=>csRender()).observe(ta);
function snap(){clearTimeout(st);if(ta.value!==ed.h[ed.i]){ed.h.length=ed.i+1;ed.h.push(ta.value);ed.i++}}
ta.oninput=()=>{ed.dirty=true;clearTimeout(st);st=setTimeout(snap,500)};
$('#et').oninput=$('#ea').oninput=()=>ed.dirty=true;
$('#ek').onchange=()=>{const k=$('#ek');if(k.value==='__chord'||k.value==='__sep'){k.value=k.dataset.v||'';if(ed)openChd();return}k.dataset.v=k.value;ed.dirty=true};
function undo(d){snap();const n=ed.i+d;if(n<0||n>=ed.h.length)return;ed.i=n;ta.value=ed.h[n];ed.dirty=true;secInfo()}
$('#eU').onclick=()=>undo(-1);$('#eR').onclick=()=>undo(1);
document.addEventListener('keydown',e=>{
  if(!$('#edit').classList.contains('on')||!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='z')return;
  e.preventDefault();undo(e.shiftKey?1:-1)});
function insGender(name){
  const sy=ta.scrollTop;snap();const v=ta.value,p=ta.selectionStart,L=v.split('\n'),ci=v.slice(0,p).split('\n').length-1,col=p-(p?v.lastIndexOf('\n',p-1)+1:0);
  const isL=l=>/^\[.+\]$/.test(l.trim()),nm=l=>l.trim().slice(1,-1).toLowerCase();let a=-1;
  for(let i=Math.min(ci,L.length-1);i>=0;i--)if(isL(L[i])){a=i;break}
  if(a<0)return false; /* no section above: a normal label above the lyrics */
  const tag='['+name+']';let cl=ci;
  if(isGen(nm(L[a]))){if(nm(L[a])===name.toLowerCase()){L.splice(a,1);if(a<ci)cl--}else L[a]=tag} /* change it, or press the same voice again to remove it */
  else{L.splice(a+1,0,tag);if(a+1<=ci)cl++}
  ta.value=L.join('\n');cl=Math.max(0,Math.min(cl,L.length-1));const st=L.slice(0,cl).join('\n').length+(cl>0?1:0),pos=st+Math.min(col,L[cl].length);
  ta.selectionStart=ta.selectionEnd=pos;ta.focus({preventScroll:true});ta.scrollTop=sy;snap();ed.dirty=true;snapCaret();return true}
function ins(name,color){
  if(!color&&isGen(name.toLowerCase())&&insGender(name))return;
  const sy=ta.scrollTop;snap();const v=ta.value,p=ta.selectionStart;
  if(name==='Verse')name='Verse '+((v.match(/^\[Verse \d+\]$/gm)||[]).length+1);
  if(color)ed.colors[name.toLowerCase()]=color;
  const ls=p?v.lastIndexOf('\n',p-1)+1:0,tag='['+name+']\n';
  let b=v.slice(0,ls);if(b&&!b.endsWith('\n\n'))b+='\n';
  ta.value=b+tag+v.slice(ls);ta.selectionStart=ta.selectionEnd=b.length+tag.length;
  ta.focus({preventScroll:true});ta.scrollTop=sy;snap();ed.dirty=true;snapCaret()}
function setKb(on){ta.inputMode=on?'text':'none';if(on&&cs&&cs.v===ta.value){const q=cs;cs=null;csRender();setTimeout(()=>{try{ta.setSelectionRange(q.a,q.b)}catch(e){}},0)}else if(!on)csRender();ta.setAttribute('enterkeyhint',on?'enter':'done');const b=$('#eK');b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')}
/* v109: when the phone hides the keyboard itself (iPhone ✓ button, Android back / hide key, tapping away), switch the Keyboard button off too */
ta.addEventListener('blur',()=>{if(ta.inputMode==='none')return;setTimeout(()=>{if(ta.inputMode!=='none'&&document.activeElement!==ta&&$('#edit').classList.contains('on'))setKb(false)},180)});
(()=>{const vv=window.visualViewport;if(!vv)return;let base=0,shrunk=false,k=ta.inputMode;
  const chk=()=>{if(ta.inputMode==='none'){base=Math.max(base,vv.height);shrunk=false;return}
    if(!base)return;if(vv.height<base-120){shrunk=true;return}
    if(shrunk&&vv.height>base-80){shrunk=false;setKb(false)}};
  vv.addEventListener('resize',chk);vv.addEventListener('scroll',chk);chk()})();
/* toolbar buttons must not steal focus from the textarea (keeps keyboard / selection alive) */
document.querySelectorAll('#edit .tb button').forEach(b=>b.addEventListener('mousedown',e=>e.preventDefault()));
$('#eK').onclick=()=>{
  const on=ta.inputMode==='none',a=ta.selectionStart,z=ta.selectionEnd;setKb(on);
  ta.blur();ta.focus({preventScroll:true});try{ta.setSelectionRange(a,z)}catch(_){}
  if(on)setTimeout(()=>{if(document.activeElement!==ta)ta.focus({preventScroll:true})},80)};
function catSummary(){const n=[...ed.cats].map(id=>(cats.find(c=>c.id===id)||{}).name).filter(Boolean),b=$('#ec'),t=n.join(', ');b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>';b.toggleAttribute('data-nt',!!n.length);const sp=E('span',n.length?'':'mut',n.length?t:'Category');b.append(sp);b.setAttribute('aria-label',n.length?L('Categories: ','Kategori: ')+t:'Categories: none');b.title=n.length?t:'Choose categories'}
function catPick(){const L=$('#catl');L.textContent='';
  [...cats].sort(byName).forEach(c=>{const on=ed.cats.has(c.id),b=E('button','arow'+(on?' sel':''));b.append(E('span','chk',on?'✓':''),E('span','',c.name));
    b.onclick=()=>{if(ed.cats.has(c.id))ed.cats.delete(c.id);else ed.cats.add(c.id);const o=ed.cats.has(c.id);b.classList.toggle('sel',o);b.firstChild.textContent=o?'✓':'';ed.dirty=true;catSummary()};L.append(b)});
  if(!cats.length)L.append(E('p','mut','No categories yet. Create one below.'))}
$('#ec').onclick=()=>{catPick();$('#cerr').textContent='';$('#cnew').value='';$('#catbox').classList.add('on')};
function catCreate(){const n=cname($('#cnew').value),e=nameErr(n);if(e){$('#cerr').textContent=e;return}
  const c={id:cid(),name:n,ids:[]};cats.push(c);ed.cats.add(c.id);ed.dirty=true;save();$('#cnew').value='';$('#cerr').textContent='';catPick();catSummary()}
$('#cadd').onclick=catCreate;$('#cnew').onkeydown=e=>{if(e.key==='Enter')catCreate()};
$('#cdone').onclick=()=>$('#catbox').classList.remove('on');$('#catbox').onclick=e=>{if(e.target.id==='catbox')$('#cdone').onclick()};
$('#eP').onclick=()=>{
  if(!navigator.clipboard?.readText)return pasteFail();
  navigator.clipboard.readText().then(x=>{snap();ta.setRangeText(x,ta.selectionStart,ta.selectionEnd,'end');snap();ed.dirty=true}).catch(pasteFail)};
function pasteFail(){setKb(true);ta.focus()}
/* A real key press means the user is typing: leave "keyboard off" mode so the caret is never snapped to line start (that reversed typing and arrow keys) */
ta.addEventListener('keydown',e=>{if(ta.inputMode!=='none'||e.ctrlKey||e.metaKey||e.altKey||['Shift','Control','Alt','Meta','CapsLock','Escape','Tab'].includes(e.key))return;setKb(true)});
ta.addEventListener('beforeinput',()=>{if(ta.inputMode==='none')setKb(true)});
/* keyboard off = selecting text is only for highlighting: no cut/copy/paste pop-up. Keyboard on: the normal pop-up is back. */
ta.addEventListener('contextmenu',e=>{if(ta.inputMode==='none')e.preventDefault()});
