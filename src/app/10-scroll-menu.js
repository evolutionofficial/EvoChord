/* ---------- v22: keep the screen on the whole time the app is open (independent of play/pause) ----------
   1) Screen Wake Lock API, re-acquired whenever the browser drops it (tab hidden, fullscreen change, ...).
   2) Fallback for iOS/PWA builds without a working Wake Lock: a 1.6 KB silent looping video (NoSleep technique),
      started from the first touch. It has no audio track, so it does not take over audio from other apps. */
let nsV=null,nsOn=0,needNs=0;
const NSRC='data:video/mp4;base64,AAAAJGZ0eXBpc29tAAACAGlzb21pc282aXNvMmF2YzFtcDQxAAAC5W1vb3YAAABsbXZoZAAAAAAAAAAAAAAAAAAAA+gAAAAAAAEAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAHndHJhawAAAFx0a2hkAAAAAwAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAQAAAAEAAAAAABg21kaWEAAAAgbWRoZAAAAAAAAAAAAAAAAAAAKAAAAAAAVcQAAAAAAC1oZGxyAAAAAAAAAAB2aWRlAAAAAAAAAAAAAAAAVmlkZW9IYW5kbGVyAAAAAS5taW5mAAAAFHZtaGQAAAABAAAAAAAAAAAAAAAkZGluZgAAABxkcmVmAAAAAAAAAAEAAAAMdXJsIAAAAAEAAADuc3RibAAAAKJzdHNkAAAAAAAAAAEAAACSYXZjMQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAQABAASAAAAEgAAAAAAAAAARVMYXZjNjAuMzEuMTAyIGxpYngyNjQAAAAAAAAAAAAAABj//wAAACxhdmNDAULACv/hABVnQsAK2nsBEAAAAwAQAAADAKDxImoBAARozg/IAAAAEHBhc3AAAAABAAAAAQAAABBzdHRzAAAAAAAAAAAAAAAQc3RzYwAAAAAAAAAAAAAAFHN0c3oAAAAAAAAAAAAAAAAAAAAQc3RjbwAAAAAAAAAAAAAAKG12ZXgAAAAgdHJleAAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNjAuMTYuMTAwAAAAhG1vb2YAAAAQbWZoZAAAAAAAAAABAAAAbHRyYWYAAAAkdGZoZAAAADkAAAABAAAAAAAAAwkAAAgAAAAChQEBAAAAAAAUdGZkdAEAAAAAAAAAAAAAAAAAACx0cnVuAAACBQAAAAUAAACMAgAAAAAAAoUAAAAJAAAACQAAAAkAAAAJAAACsW1kYXQAAAJvBgX//2vcRem95tlIt5Ys2CDZI+7veDI2NCAtIGNvcmUgMTY0IHIzMTA4IDMxZTE5ZjkgLSBILjI2NC9NUEVHLTQgQVZDIGNvZGVjIC0gQ29weWxlZnQgMjAwMy0yMDIzIC0gaHR0cDovL3d3dy52aWRlb2xhbi5vcmcveDI2NC5odG1sIC0gb3B0aW9uczogY2FiYWM9MCByZWY9MSBkZWJsb2NrPTE6MDowIGFuYWx5c2U9MHgxOjB4MTExIG1lPWhleCBzdWJtZT0yIHBzeT0xIHBzeV9yZD0xLjAwOjAuMDAgbWl4ZWRfcmVmPTAgbWVfcmFuZ2U9MTYgY2hyb21hX21lPTEgdHJlbGxpcz0wIDh4OGRjdD0wIGNxbT0wIGRlYWR6b25lPTIxLDExIGZhc3RfcHNraXA9MSBjaHJvbWFfcXBfb2Zmc2V0PTAgdGhyZWFkcz0xIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTI1MCBrZXlpbnRfbWluPTUgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD0xMCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIzLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IGlwX3JhdGlvPTEuNDAgYXE9MToxLjAwAIAAAAAOZYiEBH///w9FAAEqv4AAAAAFQZogEfUAAAAFQZpAEfUAAAAFQZpgEPUAAAAFQZqAP9QAAABDbWZyYQAAACt0ZnJhAQAAAAAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAwkBAQEAAAAQbWZybwAAAAAAAABD';
function nsStart(){
  try{
    if(!nsV){nsV=document.createElement('video');nsV.setAttribute('playsinline','');nsV.setAttribute('webkit-playsinline','');nsV.muted=true;nsV.loop=true;nsV.setAttribute('aria-hidden','true');nsV.tabIndex=-1;
      nsV.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;pointer-events:none;z-index:-1';nsV.src=NSRC;document.body.append(nsV)}
    const pr=nsV.play();if(pr&&pr.then)pr.then(()=>{nsOn=1}).catch(()=>{nsOn=0});else nsOn=1}catch(e){nsOn=0}}
function acquireWL(){
  if(document.hidden||wl||!PREF.awake)return;
  if(!navigator.wakeLock||!navigator.wakeLock.request){needNs=1;if(!nsOn)nsStart();return}
  navigator.wakeLock.request('screen').then(l=>{wl=l;needNs=0;l.addEventListener('release',()=>{if(wl===l)wl=null})}).catch(()=>{needNs=1;if(!nsOn)nsStart()})}
const keepAwake=()=>{if(document.hidden||!PREF.awake)return;if(!wl)acquireWL();if(needNs&&(!nsOn||(nsV&&nsV.paused)))nsStart()};
document.addEventListener('visibilitychange',()=>{if(!document.hidden){nsOn=nsV&&!nsV.paused?1:0;keepAwake()}});
['pointerdown','touchend','click','keydown'].forEach(v=>addEventListener(v,keepAwake,{passive:true,capture:true}));
['focus','pageshow','online','fullscreenchange'].forEach(v=>addEventListener(v,keepAwake));
setInterval(keepAwake,15000);
keepAwake();
function tick(t){
  if(!playing)return;
  if(!last)last=t;
  const L=$('#lyr'),dt=Math.min((t-last)/1000,.1);last=t;
  const base=cur.speed+SPEED_BONUS;bst+=((boostSp?1:0)-bst)*Math.min(1,dt*6);if(!boostSp&&bst<.01)bst=0; /* hold boost eases in and out */
  const sp=base+((boostSp||base)-base)*bst;
  pos+=sp*SPEED_SCALE*cur.font*.12*dt;
  /* sub-pixel smoothness: integer part via scrollTop, fractional part via GPU transform */
  const ip=Math.floor(pos);if(L.scrollTop!==ip)L.scrollTop=ip;txtEl.style.transform='translate3d(0,'+(ip-pos).toFixed(3)+'px,0)';
  const rl=L.scrollTop+RLP(L);
  const T=tops();
  for(let k=0;k<SE.length;k++){const d=SE[k];
    if(T[k]<=rl&&d._stop&&!skip.has(d)&&d!==startEl){setPlay(false);waiting=true;return}}
  if(L.scrollTop+L.clientHeight>=L.scrollHeight-2){setPlay(false);return}
  playRaf=requestAnimationFrame(tick);
}
function syncSpeed(){cur.speed=+$('#sp').value;$('#spv').textContent=cur.speed;$('#spbv').textContent=cur.speed;if(!isTemp(cur))save()} /* applies live: tick() reads cur.speed every frame, so playback never stops */
$('#sp').oninput=syncSpeed;
$('#spMinus').onclick=()=>{$('#sp').value=Math.max(+$('#sp').min,+$('#sp').value-1);syncSpeed()};
$('#spPlus').onclick=()=>{$('#sp').value=Math.min(+$('#sp').max,+$('#sp').value+1);syncSpeed()};
function setFont(v){
  const L=$('#lyr'),old=cur.font,nf=clamp(Math.round(v*10)/10,FMIN,FMAX);if(nf===old)return;
  const f=$('#txt').firstElementChild,S=f?f.offsetTop:0,rl=RLP(L),y=L.scrollTop+rl;
  cur.font=nf;$('#txt').style.fontSize=nf+'px';SO=null;annPlay(); /* v68: annotations re-anchor and rescale with the lyrics */
  if(y>S)L.scrollTop=S+(y-S)*nf/old-rl}
$('#sp').onchange=save;
/* v178: inside the Android app (Trusted Web Activity) the app itself is immersive, so the browser Fullscreen API is not requested:
   it only added Chrome's "To exit full screen" notice every time a lyric opened. Detected from the launch referrer
   (android-app://<package>) and remembered for the session; a fullscreen display mode counts too. */
function inTwa(){try{
  if(sessionStorage.getItem('evo.twa')==='1')return true;
  if(/^android-app:\/\/id\.evolyric\.app/.test(document.referrer||'')||(window.matchMedia&&matchMedia('(display-mode: fullscreen)').matches)){sessionStorage.setItem('evo.twa','1');return true}
}catch(e){}return false}
function enterFs(){ /* the play view IS the fullscreen view: layout class stays for as long as a song is open; browser fullscreen is best-effort */
  if(!fs){fs=true;$('#play').classList.add('fs');setTimeout(()=>{fixPad();$('#lyr').scrollTop=$('#lyr').scrollTop;hl()},80)}
  const el=document.documentElement;
  if(PREF.fscr&&!inTwa()&&!document.fullscreenElement&&el.requestFullscreen&&!/iPhone|iPad|iPod/.test(navigator.userAgent))el.requestFullscreen().catch(()=>{});
}
function exitFs(){
  if(!fs)return;fs=false;$('#play').classList.remove('fs');
  if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
  setTimeout(fixPad,80);
}
document.addEventListener('fullscreenchange',()=>setTimeout(fixPad,80)); /* Esc leaves browser fullscreen only; the app layout stays */
/* v115: L button on the home screen returns to the last opened lyric; hidden until a lyric has been opened */
function lastSong(){if(cur&&!isTemp(cur))return songs.includes(cur)?cur:songs.find(x=>x.id===cur.id)||null;
  let id=null;try{id=localStorage.getItem('evo.lastsong')}catch(e){}
  const l=id&&songs.find(x=>x.id===id);if(l)return l;
  const q=Qs();for(const i of q){const x=songs.find(o=>o.id===i);if(x){q.splice(q.indexOf(i),1);qSave();qRender();return x}}return null}
/* v153: the L button flashes – a warm burst from the button while the lyrics open */
function lFlash(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch(e){}const b=$('#lastb'),r=b.getBoundingClientRect();if(!r.width)return;
  b.classList.remove('fl');void b.offsetWidth;b.classList.add('fl');setTimeout(()=>b.classList.remove('fl'),500);
  const f=E('div','lfx');f.setAttribute('aria-hidden','true');f.style.left=(r.left+r.width/2)+'px';f.style.top=(r.top+r.height/2)+'px';document.body.append(f);setTimeout(()=>f.remove(),600)}
$('#lastb').onclick=()=>{const s=lastSong();if(!s)return void note('Select a song first',true);lFlash();if(s===cur&&$('#play')){show('play');enterFs();hl()}else openSong(s)};
function leavePlay(){setPlay(false);if(fs)exitFs();$('#q').value='';dropTemp();refresh();show('list')} /* Home returns to the list with an empty search */
document.querySelectorAll('.sfield .clr').forEach(b=>{const i=b.parentNode.querySelector('input');
  b.addEventListener('pointerdown',e=>e.preventDefault()); /* keep focus (and the on-screen keyboard) on the box */
  b.addEventListener('click',()=>{i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));i.focus()})});
/* v61: plan tag next to the wordmark. 'pro' = full version / subscribed, 'demo' = not subscribed (not used yet: everyone shows Pro for now) */
function setTier(t){const e=$('#tier');if(!e)return;e.dataset.tier=t==='demo'?'demo':'pro';e.textContent=t==='demo'?'Demo':'Pro'}
setTier('pro');
/* v60: sidebar back-to-top */
(function(){const L=$('#dItems'),b=$('#dTop');let q=0;
  L.addEventListener('scroll',()=>{if(q)return;q=1;requestAnimationFrame(()=>{q=0;b.classList.toggle('on',L.scrollTop>260)})},{passive:true});
  b.onclick=()=>{try{L.scrollTo({top:0,behavior:'smooth'})}catch(e){L.scrollTop=0}}})();
/* menu */
const mn=$('#menu');
function menuOpen(on){if(on){const t=isTemp(cur);$('#mS').hidden=!user||t;$('#mE').hidden=t;$('#mV').hidden=!t;$('#mT').hidden=!t}mn.classList.toggle('on',!!on);$('#mbg').classList.toggle('on',!!on);$('#mn').setAttribute('aria-expanded',on?'true':'false')}
$('#mn').onclick=()=>menuOpen(!mn.classList.contains('on'));
$('#mbg').onclick=()=>menuOpen(false); /* tap anywhere outside closes it (the tap does not reach the lyrics, so it never toggles play) */
$('#mS').onclick=()=>{menuOpen(false);cur&&!isTemp(cur)&&sendPick(cur)};
$('#mV').onclick=()=>{menuOpen(false);saveTemp()};
$('#mT').onclick=()=>{menuOpen(false);editTemp()};
$('#tsv').onclick=()=>saveTemp();
$('#mE').onclick=()=>{menuOpen(false);if(isTemp(cur))return;setPlay(false);openEdit(cur)};
$('#mR').onclick=()=>{menuOpen(false);setPlay(false);skip.clear();$('#lyr').scrollTop=0;waiting=!!startEl;if(waiting)toast('Ketuk layar atau tekan play untuk mulai')};
/* laci */
const dw=$('#drawer'),sc=$('#scrim');
function drawer(on){if(on)menuOpen(false);if(!on||on)$('#dTop').classList.remove('on');dw.classList.toggle('open',on);sc.classList.toggle('open',on);if(!on)qpClose();if(on){$('#dq').value='';dFill();drawerItems();const di=$('#dItems');di.classList.add('stg');clearTimeout(drawer._t);drawer._t=setTimeout(()=>di.classList.remove('stg'),750)}}
function dFill(){const e=$('#dcat');e.textContent='';const o=E('option','','All Songs');o.value='';e.append(o);[...cats].sort(byName).forEach(c=>{const o=UE('option','',c.name);o.value=c.id;e.append(o)});e.value=lib.v==='cat'?lib.id:''}
const drawerItems=()=>{items($('#dItems'),$('#dq').value,(s,b)=>qPop(s,b),false,poolFor($('#dcat').value||null));dEmptyWeb()}; /* single tap -> Add to Queue / Open popup (never opens directly) */
$('#dcat').onchange=drawerItems;
/* sidebar view: wide (default) or compact (title + key only, tighter rows); remembered on this device */
const SBV='evolyric-sbview';
function sbView(c,sv){dw.classList.toggle('cmp',c);const b=$('#dView');b.setAttribute('aria-pressed',c?'true':'false');b.setAttribute('aria-label',c?'Wide list':'Compact list');
  $('#dvi').setAttribute('d',c?'M3 4h14M3 8h14M3 12h14M3 16h14':'M3 5h14M3 10h14M3 15h14');if(sv){try{localStorage.setItem(SBV,c?'compact':'wide')}catch(e){}}}
try{sbView(localStorage.getItem(SBV)==='compact')}catch(e){sbView(false)}
/* v121: same compact toggle on Home, next to Sort */
const HV='evolyric-homeview';
function hvView(c,sv){$('#items').classList.toggle('cmp',c);const b=$('#hView');b.classList.toggle('on',c);b.setAttribute('aria-pressed',c?'true':'false');b.setAttribute('aria-label',c?'Wide list':'Compact list');
  $('#hvi').setAttribute('d',c?'M3 4h14M3 8h14M3 12h14M3 16h14':'M3 5h14M3 10h14M3 15h14');if(sv){try{localStorage.setItem(HV,c?'compact':'wide')}catch(e){}}}
try{hvView(localStorage.getItem(HV)==='compact')}catch(e){hvView(false)}
$('#hView').onclick=()=>hvView(!$('#items').classList.contains('cmp'),1);
$('#dView').onclick=()=>sbView(!dw.classList.contains('cmp'),1);
$('#dr').onclick=()=>drawer(!dw.classList.contains('open'));
$('#dq').oninput=drawerItems;$('#dX').onclick=sc.onclick=()=>drawer(false);
$('#dBack').onclick=()=>{drawer(false);leavePlay()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if($('#fabm').classList.contains('on'))fabOpen(false);else if(mn.classList.contains('on'))menuOpen(false);else if($('#qpop').classList.contains('on'))qpClose();else drawer(false)}});


/* ---------- v22: compact Speed controller ---------- */
let spT=0,spDown=0;
function spOpen(on){const p=$('#spp'),b=$('#spb');if(on==null)on=!p.classList.contains('open');p.classList.toggle('open',on);b.classList.toggle('hid',on);b.setAttribute('aria-expanded',on?'true':'false');if(!on)p.classList.remove('act');spBump()}
function spBump(){clearTimeout(spT);if($('#spp').classList.contains('open'))spT=setTimeout(()=>{if(spDown)spBump();else spOpen(false)},3000)} /* idle -> back to the small corner button */
$('#spb').onclick=()=>spOpen();$('#spx').onclick=()=>spOpen(false);
$('#vsb').onclick=()=>vsOpen();$('#vsx').onclick=()=>vsOpen(false);
$('#vsg').onclick=()=>{const t=cur;if(!isTemp(t))return;vsOpen(false);wlGoogle(t.title,true)}; /* v142: More version -> Google; coming back asks Show lyrics / Back as usual */
$('#spp').addEventListener('pointerdown',spBump);$('#spp').addEventListener('click',spBump);
$('#sp').addEventListener('pointerdown',()=>{spDown=1;$('#spp').classList.add('act')});
['pointerup','pointercancel'].forEach(v=>$('#sp').addEventListener(v,()=>{spDown=0;$('#spp').classList.remove('act');spBump()}));
$('#sp').addEventListener('input',spBump);
