/* ---------- v17: Song Queue (device-local, separate from the library) ---------- */
const QBASE='evolyric-queue-v1',RM=()=>matchMedia('(prefers-reduced-motion:reduce)').matches,EASE='cubic-bezier(.22,1,.36,1)';
let queue=[],qKey='',qFresh=null,nexting=0,endIO=null,endVis=false,qpS=null;
const qKeyNow=()=>QBASE+(LK===K?'':LK.slice(K.length)); /* guest and each account keep their own queue */
function Qs(){const k=qKeyNow();if(k!==qKey){qKey=k;queue=[];try{const a=JSON.parse(localStorage.getItem(k)||'[]');if(Array.isArray(a))queue=[...new Set(a.filter(x=>typeof x==='string'))]}catch(e){}}return queue}
const qSave=()=>{try{localStorage.setItem(qKey||qKeyNow(),JSON.stringify(queue))}catch(e){}};
const qSongs=()=>Qs().map(id=>songs.find(o=>o.id===id)).filter(Boolean); /* ids of missing songs are ignored, never rewritten */
function placeQ(){const L=$('#lyr'),P=$('#play');if(!P.classList.contains('on'))return;const t=L.offsetTop;P.style.setProperty('--qt',(t+8)+'px');P.style.setProperty('--nt',Math.round(t+L.clientHeight*.35-21)+'px')}
const GRIP='<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><circle cx="5.5" cy="3.5" r="1.25"/><circle cx="10.5" cy="3.5" r="1.25"/><circle cx="5.5" cy="8" r="1.25"/><circle cx="10.5" cy="8" r="1.25"/><circle cx="5.5" cy="12.5" r="1.25"/><circle cx="10.5" cy="12.5" r="1.25"/></svg>';
const XI='<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
function qRender(){
  const L=$('#ql'),list=qSongs(),n=list.length;L.textContent='';
  $('#qtg').classList.toggle('has',n>0);$('#qn').textContent=n||'';$('#qtg').setAttribute('aria-label',n?'Queue, '+n+' songs':'Queue');
  list.forEach((s,i)=>{
    const r=E('div','qi'+(s.id===qFresh?' new':''));r.dataset.id=s.id;
    const g=E('button','qg');g.type='button';g.innerHTML=GRIP;g.setAttribute('aria-label','Reorder '+(s.title||'song'));
    g.addEventListener('pointerdown',e=>qDrag(e,r));g.addEventListener('keydown',e=>qKey_(e,s.id));
    const t=E('div','qt'),num=E('i','',String(i+1)),nm=UE('span','',s.title,'Untitled');t.append(num,nm);t.title=s.title||'';if(s.title)t.setAttribute('data-nt','');
    const d=E('button','qd');d.type='button';d.innerHTML=XI;d.setAttribute('aria-label','Remove '+(s.title||'song'));d.onclick=()=>qRemove(s.id,r);
    r.append(g,t,d);L.append(r)});
  if(!n)L.append(E('div','qe','Queue is empty'));
  qClrReset(n>0);
  qFresh=null;updNext();updNxl()}
/* v97: small "Next song: title" under the end line, fixed size (ignores lyric zoom) */
function updNxl(){const e=document.querySelector('#txt .nxl');if(!e)return;const n=qSongs()[0];e.textContent='';
  if(!n){e.style.display='none';return}e.style.display='';const a=E('span','',L_nxt()),b=E('span','nxt','\u00a0'+(n.title||'Untitled'));b.dataset.nt='1';e.append(a,document.createTextNode(':'),b)}
const L_nxt=()=>'Next song';
/* v131: Clear queue — shown under the list only while the queue has songs. First tap arms it (label changes for 3 s), second tap empties the queue, so a stray tap on stage cannot wipe it. */
let qcT=0;
function qClrReset(show){const b=$('#qclr');clearTimeout(qcT);b.classList.remove('arm');b.textContent='Clear queue';b.hidden=!show}
$('#qclr').onclick=()=>{const b=$('#qclr');
  if(!b.classList.contains('arm')){b.classList.add('arm');b.textContent='Tap again';clearTimeout(qcT);qcT=setTimeout(()=>qClrReset(!b.hidden),3000);return}
  Qs();queue.length=0;qSave();qRender();note('Queue cleared')};
function qBump(){const b=$('#qtg');b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump')}
/* v93: the title flies to the queue button, then the button bumps */
function qFly(title,from){
  const to=$('#qtg').getBoundingClientRect();
  if(!from||!to.width||!('animate' in Element.prototype)){qBump();return}
  const g=E('div','qfly',title||'Untitled'),w=Math.min(from.width,220),x0=from.left+(from.width-w)/2,y0=from.top+from.height/2-17;
  g.style.cssText='left:'+x0+'px;top:'+y0+'px;width:'+w+'px';document.body.append(g);
  const dx=to.left+to.width/2-(x0+w/2),dy=to.top+to.height/2-(y0+17),arc=-Math.min(90,Math.abs(dy)*.35+30);
  const a=g.animate([{transform:'translate(0,0) scale(1)',opacity:1,offset:0},
    {transform:'translate('+dx*.45+'px,'+(dy*.45+arc)+'px) scale(.62)',opacity:1,offset:.5,easing:'ease-in'},
    {transform:'translate('+dx+'px,'+dy+'px) scale(.12)',opacity:.2,offset:1}],{duration:640,easing:'cubic-bezier(.3,.1,.3,1)',fill:'forwards'});
  let fin=0;const done=()=>{if(fin)return;fin=1;g.remove();qBump()};a.onfinish=done;a.oncancel=done;setTimeout(done,1500)}
function qAdd(s,from){const q=Qs();if(q.includes(s.id)){note('Already in queue');return}q.push(s.id);qFresh=s.id;qSave();qRender();if(!RM())qFly(s.title,from);note('Added to queue')}
function qRemove(id,row){
  if(row&&row.classList.contains('out'))return;
  const go=()=>{const i=queue.indexOf(id);if(i>=0){queue.splice(i,1);qSave()}qRender()};
  if(row&&!RM()){row.style.height=row.offsetHeight+'px';void row.offsetHeight;row.classList.add('out');row.style.height='';setTimeout(go,230)}else go()}
function qMove(id,to){ /* move id so it sits where the visible song `to` sits */
  const i=queue.indexOf(id),j=queue.indexOf(to);if(i<0||j<0||i===j)return;queue.splice(i,1);queue.splice(i<j?j:j,0,id);qSave()}
function qKey_(e,id){
  if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();
  const v=qSongs().map(o=>o.id),i=v.indexOf(id),j=i+(e.key==='ArrowUp'?-1:1);if(j<0||j>=v.length)return;
  qMove(id,v[j]);qRender();const r=$('#ql').querySelector('[data-id="'+id+'"] .qg');if(r)r.focus()}
function qDrag(e,row){
  if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();
  const L=$('#ql'),rows=[...L.querySelectorAll('.qi')],from=rows.indexOf(row);if(from<0||rows.length<2)return;
  const H=row.offsetHeight,y0=e.clientY,s0=L.scrollTop,h=e.currentTarget;let to=from,cy=y0,raf=0;
  try{h.setPointerCapture(e.pointerId)}catch(_){}
  row.classList.add('drag');rows.forEach(r=>{if(r!==row)r.classList.add('shift')});
  const apply=()=>{
    const dy=clamp(cy-y0+L.scrollTop-s0,-from*H,(rows.length-1-from)*H);to=clamp(Math.round(from+dy/H),0,rows.length-1);
    row.style.transform='translateY('+dy+'px) scale(1.02)';
    rows.forEach((r,i)=>{if(r===row)return;let t=0;if(from<to&&i>from&&i<=to)t=-H;else if(from>to&&i>=to&&i<from)t=H;r.style.transform=t?'translateY('+t+'px)':''})};
  const edge=()=>{const b=L.getBoundingClientRect();let d=0;if(cy<b.top+22)d=-6;else if(cy>b.bottom-22)d=6;
    if(d&&((d<0&&L.scrollTop>0)||(d>0&&L.scrollTop<L.scrollHeight-L.clientHeight))){L.scrollTop+=d;apply()}raf=requestAnimationFrame(edge)};
  raf=requestAnimationFrame(edge);
  const mv=ev=>{if(ev.pointerId===e.pointerId){cy=ev.clientY;apply()}};
  const end=ev=>{if(ev.pointerId!==e.pointerId)return;cancelAnimationFrame(raf);
    h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',end);h.removeEventListener('pointercancel',end);
    if(ev.type==='pointerup'&&to!==from)qMove(row.dataset.id,rows[to].dataset.id);
    qRender()};
  h.addEventListener('pointermove',mv);h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end)}
function qOpen(on){const p=$('#qp');if(on==null)on=!p.classList.contains('open');p.classList.toggle('open',on);$('#qtg').setAttribute('aria-expanded',on?'true':'false')}
$('#qtg').onclick=()=>qOpen();$('#qx').onclick=()=>qOpen(false);
/* sidebar popup */
function qPop(s,el){
  qpS=s;qpR=el.getBoundingClientRect();const p=$('#qpop');$('#qpt').textContent=s.title||tr('Untitled');
  const r=el.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;
  const x=clamp(r.left+r.width/2-w/2,8,innerWidth-w-8);let y=r.bottom+2,up=false;
  if(y+h>innerHeight-8){y=r.top-h-2;up=true}y=Math.max(8,y);
  p.style.left=x+'px';p.style.top=y+'px';p.style.setProperty('--ox',clamp(r.left+r.width/2-x,16,w-16)+'px');p.style.setProperty('--oy',up?'100%':'0');
  $('#qbg').classList.add('on');p.classList.add('on')}
function qpClose(){$('#qbg').classList.remove('on');$('#qpop').classList.remove('on')}
$('#qbg').onclick=qpClose;
$('#qpa').onclick=()=>{const s=qpS,f=qpR;qpClose();if(s)qAdd(s,f)};
$('#qpo').onclick=()=>{const s=qpS;qpClose();if(s){drawer(false);openSong(s,true)}};
/* Next Song: shown only while the existing .end line is visible AND the queue has a song */
function watchEnd(){
  if(endIO){endIO.disconnect();endIO=null}endVis=false;updNext();
  const e=$('#txt .end');if(!e||!('IntersectionObserver' in window))return;
  endIO=new IntersectionObserver(es=>{endVis=es[es.length-1].isIntersecting;updNext()},{root:$('#lyr'),rootMargin:'0px 0px -44px 0px',threshold:0});endIO.observe(e)}
function updNext(){const b=$('#nxt'),on=endVis&&qSongs().length>0&&$('#play').classList.contains('on');b.classList.toggle('on',on);b.tabIndex=on?0:-1;b.setAttribute('aria-hidden',on?'false':'true')}
/* v93: page turn — the old page is copied on top and swings away like a book page */
let turning=0,qpR=null;
function pageSnap(){try{const L=$('#lyr'),r=L.getBoundingClientRect(),P=$('#play');if(!r.width)return null;
  const c=L.cloneNode(true);c.removeAttribute('id');c.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
  return {c,r,st:L.scrollTop,bg:getComputedStyle(P).backgroundColor||'#0d0a08'}}catch(e){return null}}
/* v96: page curl — the page peels away from the right edge over a small cylinder (a slight roll), its back side slides off to the left */
function pageTurn(k){turning=1;const {r,c,bg}=k,W=r.width,H=r.height,R=15,N=10,PI=Math.PI,D=860,ds=PI*R/N;
  const w=E('div','pgturn');w.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+W+'px;height:'+H+'px';
  const mk=()=>{const x=E('div','pgw');x.style.cssText='position:absolute;left:0;top:0;width:'+W+'px;height:'+H+'px';const q=c.cloneNode(true);
    q.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;background:'+bg;const o=E('div','pgl');x.append(q,o);return {x,q,o}};
  const flat=mk(),cast=E('div','pgcast'),sheet=E('div','pgback'),sheetSh=E('div','pgbsh'),strips=[],backs=[];
  w.append(cast,flat.x);for(let i=0;i<N;i++){const m=mk(),b=E('div','pgbs');strips.push(m);backs.push(b);w.append(m.x,b)}w.append(sheetSh,sheet);
  document.body.append(w);flat.q.scrollTop=k.st;strips.forEach(m=>{m.q.scrollTop=k.st});
  const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,X0=W-3,X1=-R-4,t0=performance.now();let raf=0;
  const frame=now=>{const t=Math.min(1,(now-t0)/D),x=X0+(X1-X0)*ease(t);
    flat.x.style.clipPath='inset(0 '+Math.max(0,W-Math.max(x,0))+'px 0 0)';flat.o.style.opacity=0;
    for(let i=0;i<N;i++){const u0=x+i*ds,u1=Math.min(W,x+(i+1)*ds),m=strips[i],bk=backs[i];
      if(u1-u0<=.01||u0>=W||u1<0&&u0<0&&false){m.x.style.display=bk.style.display='none';continue}
      const a0=i*ds/R,a1=Math.min(PI,(u1-x)/R),x0=x+R*Math.sin(a0),x1=x+R*Math.sin(a1),k2=(x1-x0)/Math.max(.01,u1-u0);
      if(k2>0.02){bk.style.display='none';m.x.style.display='';
        m.x.style.clipPath='inset(0 '+(W-u1)+'px 0 '+u0+'px)';m.x.style.transformOrigin='0 0';m.x.style.transform='translateX('+(x0-k2*u0)+'px) scaleX('+k2+')';
        m.o.style.opacity=(.05+.5*Math.pow(Math.sin((a0+a1)/2),2)).toFixed(3)}
      else{m.x.style.display='none';bk.style.display='';const l=Math.min(x0,x1);bk.style.left=l+'px';bk.style.width=Math.abs(x1-x0)+.6+'px';
        bk.style.opacity=(.85+.15*Math.cos((a0+a1)/2)).toFixed(2)}}
    const L=W-x-PI*R;if(L>0){sheet.style.display=sheetSh.style.display='';sheet.style.left=(x-L)+'px';sheet.style.width=L+.6+'px';sheetSh.style.left=(x-L-34)+'px'}else sheet.style.display=sheetSh.style.display='none';
    cast.style.left=(x+R*.2)+'px';cast.style.opacity=Math.min(1,Math.max(0,(W-x)/30,0)).toFixed(2)*(t>.9?(1-t)*10:1);
    if(t<1)raf=requestAnimationFrame(frame);else done()};
  const done=()=>{cancelAnimationFrame(raf);w.remove();turning=0};
  try{$('#lyr').animate([{opacity:.55,transform:'scale(.985)'},{opacity:1,transform:'scale(1)'}],{duration:D,easing:'cubic-bezier(.2,.7,.2,1)'})}catch(e){}
  raf=requestAnimationFrame(frame);setTimeout(()=>{if(turning)done()},D+500)}
function qNext(){
  if(nexting)return;const id=Qs().find(x=>songs.some(o=>o.id===x));if(!id)return;const s=songs.find(o=>o.id===id);
  nexting=1;const snap=RM()?null:pageSnap();if(snap)turning=1;
  try{openSong(s)}catch(err){nexting=0;note('Could not open song',1);return}
  if(cur===s){const i=queue.indexOf(id);if(i>=0){queue.splice(i,1);qSave()}} /* removed only after the song really is active */
  qRender();if(snap)pageTurn(snap);setTimeout(()=>{nexting=0},700)}
$('#nxt').onclick=qNext;
function songFx(){if(RM()||turning)return;try{$('#lyr').animate([{opacity:0},{opacity:1}],{duration:460,easing:EASE});}catch(e){}}
/* Safari ignores user-scalable=no: block only its page-zoom gesture, nothing else */
document.addEventListener('gesturestart',e=>e.preventDefault());
const FLASH='.ic,.step,#qtg,#spb,#spx,#qx,#dView,#nxt,.clr,#dTop,#sortb,#find';
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest(FLASH);if(!b||b.disabled)return;
  b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash');
  b.addEventListener('animationend',function f(ev){if(ev.animationName==='btnFlash'){b.classList.remove('flash');b.removeEventListener('animationend',f)}})},{passive:true});
document.addEventListener('contextmenu',e=>{const t=e.target;if(!(t.closest&&t.closest('input,textarea,[contenteditable]')))e.preventDefault()}); /* no long-press menu except in editable fields */
/* Gestures on the lyric canvas (one Pointer Events system):
   tap = play/pause, hold still 1 s while playing = speed 30 until release, touch + drag left/right = scroll speed (the speed panel opens with the value), two fingers = text size. */
/* v45: floating speed HUD, top centre of the lyrics, visible only while the finger is dragging */
let hudT=0;const HUD=$('#shud');
function hudSet(){const v=cur.speed;HUD.querySelector('b').textContent=v;HUD.style.setProperty('--p',((v-1)/24).toFixed(4))}
function hudShow(){clearTimeout(hudT);clearTimeout(hudO);hudSet();HUD.style.top=($('#lyr').offsetTop+14)+'px';
  if(HUD.classList.contains('on')&&!HUD.classList.contains('out'))return;HUD.classList.remove('on','out');void HUD.offsetWidth;HUD.classList.add('on')}
let hudO=0;
function hudHide(){clearTimeout(hudT);hudT=setTimeout(()=>{HUD.classList.remove('on');void HUD.offsetWidth;HUD.classList.add('out');hudO=setTimeout(()=>HUD.classList.remove('out'),880)},420)}
/* v45: a tap outside any open panel / menu / sidebar closes them all (and does not reach the lyrics, so it will not toggle play) */
(function(){
  const P=[['#menu','#mn',()=>mn.classList.contains('on'),()=>menuOpen(false)],['#drawer','#dr',()=>dw.classList.contains('open'),()=>drawer(false)],
    ['#qp','#qtg',()=>$('#qp').classList.contains('open'),()=>qOpen(false)],['#qpop',null,()=>$('#qpop').classList.contains('on'),()=>qpClose()],
    ['#spp','#spb',()=>$('#spp').classList.contains('open'),()=>spOpen(false)],['#vsp','#vsb',()=>$('#vsp').classList.contains('open'),()=>vsOpen(false)],['#fabm','#fab',()=>$('#fabm').classList.contains('on'),()=>fabOpen(false)],
    ['#amenu','#avb',()=>!$('#amenu').hidden,()=>closeMenu()]],
    MOD=['#ctx','#nbox','#cbox','#addbox','#catbox','#authbox','#notebox','#arr'];
  document.addEventListener('pointerdown',e=>{
    if(MOD.some(m=>{const x=$(m);return x&&x.classList.contains('on')}))return;
    const open=P.filter(x=>x[2]());if(!open.length)return;const t=e.target;if(!t||!t.closest)return;
    if(open.some(x=>t.closest(x[0])||(x[1]&&t.closest(x[1]))))return;
    open.forEach(x=>x[3]());e.stopPropagation()},true)})();
const Ly=$('#lyr'),PT=new Map(),SPX=14,BOOSTV=30+SPEED_BONUS;let G=null; /* SPX: pixels of horizontal drag per speed step */
const pdist=()=>{const [a,b]=[...PT.values()];return Math.hypot(a.x-b.x,a.y-b.y)};
Ly.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  try{Ly.setPointerCapture(e.pointerId)}catch(_){}
  PT.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(G)clearTimeout(G.h);
  if(PT.size===2){G={pinch:1,d0:pdist()||1,f0:cur.font};return}
  if(PT.size>2)return;
  G={x:e.clientX,y:e.clientY,t:performance.now(),mv:0,sp:0,vert:0,boost:0,was:playing};
  /* holding still for 1 s while auto-scroll runs = fast-forward at speed 30 until release */
  if(playing)G.h=setTimeout(()=>{const g=G;if(g&&!g.mv&&!g.sp&&!g.pinch&&playing){g.boost=1;boostSp=BOOSTV}},1000)});
Ly.addEventListener('pointermove',e=>{
  const p=PT.get(e.pointerId);if(!p||!G)return;p.x=e.clientX;p.y=e.clientY;
  if(G.pinch){if(PT.size===2)setFont(G.f0*Math.pow(pdist()/G.d0,1.35));return}
  const dx=e.clientX-G.x,dy=e.clientY-G.y;
  if(G.sp){const v=Math.max(1,Math.min(25,G.s0+Math.round((e.clientX-G.sx)/SPX)));if(v!==cur.speed){$('#sp').value=v;syncSpeed()}hudSet();return}
  if(Math.hypot(dx,dy)>12){G.mv=1;clearTimeout(G.h);
    if(!G.vert&&Math.abs(dx)>1.4*Math.abs(dy)){G.sp=1;G.sx=e.clientX;G.s0=cur.speed;hudShow()}
    else G.vert=1}});
function gEnd(e,cancel){
  PT.delete(e.pointerId);if(!G)return;
  if(G.pinch){if(!PT.size){if(!isTemp(cur))save();G=null}return}
  const g=G;G=null;clearTimeout(g.h);
  if(g.boost){boostSp=0;return}
  if(g.sp){hudHide();return}
  if(!cancel&&!g.mv&&performance.now()-g.t<600){
        setPlay(!playing)}}
Ly.addEventListener('pointerup',e=>gEnd(e,false));Ly.addEventListener('pointercancel',e=>gEnd(e,true));
Ly.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
Ly.addEventListener('contextmenu',e=>e.preventDefault());
/* v133: double-tap the title bar (the space between ☰ and ⋮) = edit this song. Also in ⋮ → Edit song. The lyrics area no longer has any edit shortcut, so a burst of taps on stage cannot open the editor. */
(function(){const bar=$('#play .hd');let d=null,last=0,lx=0,ly=0;
  bar.addEventListener('pointerdown',e=>{d=e.target.closest('button')?null:{x:e.clientX,y:e.clientY}});
  bar.addEventListener('pointerup',e=>{if(!d||Math.hypot(e.clientX-d.x,e.clientY-d.y)>12){d=null;return}d=null;
    const n=performance.now();
    if(last&&n-last<400&&Math.hypot(e.clientX-lx,e.clientY-ly)<40){last=0;if(isTemp(cur))return;menuOpen(false);setPlay(false);openEdit(cur);return}
    last=n;lx=e.clientX;ly=e.clientY});
  bar.addEventListener('pointercancel',()=>{d=null})})();
/* v130: if the phone suspends the page in the middle of a touch, the 'finger up' never arrives. Forget half-finished touches and leftover flying titles when the app is hidden, shown again, or a song is opened. */
function resetInput(){PT.clear();if(G)clearTimeout(G.h);G=null;boostSp=0;spDown=0;$('#spp').classList.remove('act');pressStop=null;document.querySelectorAll('.qfly').forEach(e=>e.remove())}
document.addEventListener('visibilitychange',resetInput);addEventListener('pagehide',resetInput);addEventListener('pageshow',resetInput);addEventListener('blur',resetInput);

