const K='evolyric-v1',$=s=>document.querySelector(s);
const SPEED_BONUS=3,BOOST1=15+SPEED_BONUS,BOOST2=20+SPEED_BONUS; /* every speed value runs +3 faster */
const FMIN=12,FMAX=120;
const SPEED_SCALE=.8; /* actual px/s = (speed+3) x SPEED_SCALE x font x .12. v21: 1 -> .8 (= 20% slower on every setting; stored speeds are unchanged, so no migration) */
const E=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.textContent=h;return e};
/* v162: user content (titles, artists, lyrics, section and category names, notes, people) is never translated: UE marks it data-nt; fb is the interface fallback, which is translated */
const UE=(t,c,v,fb)=>{const e=E(t,c,v||fb||'');if(v)e.setAttribute('data-nt','');return e};
/* v157: the old demo song – no longer added to new libraries; kept only to recognise (and never upload) an untouched copy on older devices */
const SAMPLE={id:'s1',title:'Contoh Lagu',artist:'EvoChord',speed:5,font:32,lyrics:
'[Intro]\n(petik pelan)\n\n[Verse 1]\nLampu panggung mulai menyala\nSuara kita mengisi ruang\nSatu per satu baris mengalir\nTanpa kertas yang berserakan\n\n[Chorus]\nGulir saja, biar lirik berjalan\nKita bernyanyi sampai selesai\n\n[Male 1]\nBagian ini milik dia\n\n[Female 1]\nBagian ini milik aku\n\n[All]\nSatu suara, satu panggung\n\n[Interlude]\n(solo gitar)\n\n[Verse 2]\nSetelah lagu ini usai\nTepuk tangan jadi penutup\n\n[Rit]\nPelan… dan selesai'};
let songs=[],cur=null,ed=null,playing=false,boostSp=0,bst=0,frac=0,last=0,fs=false,wl=null,skip=new Set(),g=null,delArm=0,t0,waiting=false,lastT=0,startEl=null,lastA=null,cats=[];
const SAMPLE_J=JSON.stringify(SAMPLE);let LK=K,LKC='evolyric-cats-v1'; /* active storage keys: guest = K/KC, signed-in = per-account cache (see cloud.js) */
try{const h=JSON.parse(localStorage.getItem('evolyric-auth-hint')||'null');if(h&&h.id&&localStorage.getItem(K+':u:'+h.id)!=null){LK=K+':u:'+h.id;LKC='evolyric-cats-v1:u:'+h.id}}catch(e){}
try{const r=localStorage.getItem(LK);songs=r?JSON.parse(r):[]; /* v157: a new library starts empty (no demo song) */if(!Array.isArray(songs))throw 0}catch(e){try{localStorage.setItem(LK+'-corrupt',localStorage.getItem(LK)||'')}catch(_){}songs=[]}
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist().catch(()=>{})}catch(e){}
let saveBad=0;const KC='evolyric-cats-v1';
const saveLocal=()=>{try{localStorage.setItem(LK,JSON.stringify(songs));localStorage.setItem(LKC,JSON.stringify(cats));if(saveBad){saveBad=0;$('#svw').hidden=true}}catch(e){saveBad=1;$('#svw').hidden=false}};
/* Vokal→Vocal: rewrite old [Vokal N] labels (lyrics, colours, stops) */
const migVocal=()=>{let ch=false;const fx=o=>{if(!o||typeof o!=='object')return;Object.keys(o).forEach(k=>{if(/^vokal \d+$/.test(k)){const n=k.replace('vokal','vocal');if(!(n in o))o[n]=o[k];delete o[k];ch=true}})};
  (songs||[]).forEach(x=>{if(!x)return;if(typeof x.lyrics==='string'&&/^\s*\[vokal \d+\]\s*$/im.test(x.lyrics)){x.lyrics=x.lyrics.replace(/^(\s*)\[vokal (\d+)\](\s*)$/gim,'$1[Vocal $2]$3');ch=true}fx(x.colors);fx(x.stops)});return ch};
const save=()=>{migVocal();saveLocal();if(window.Cloud)Cloud.touch()};
try{if(migVocal())saveLocal()}catch(e){}
function toast(){}
/* v108: no bottom pop-ups for routine confirmations (the screen already shows the result); errors and the few results with no visible change still show */
const QUIET=/^(Pinned to top|Unpinned|Removed from |Song deleted|Category deleted|Category created|Added to queue|Already in queue|Profile saved|Signed out|Backup file saved|File cadangan disimpan)|songs? added to /;
let noteT;function note(m,bad){if(!bad&&QUIET.test(m))return;const n=$('#note');n.textContent=m;n.classList.toggle('bad',!!bad);n.classList.add('on');clearTimeout(noteT);noteT=setTimeout(()=>n.classList.remove('on'),2400)}
/* ---------- Categories data: category -> list of master song ids (songs are never copied) ---------- */
const cid=()=>'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const cname=v=>String(v||'').replace(/\s+/g,' ').trim();
const byName=(a,b)=>a.name.localeCompare(b.name,'id');
(function loadCats(){
  let raw=null;try{raw=localStorage.getItem(LKC)}catch(e){}
  if(raw){try{const a=JSON.parse(raw);if(!Array.isArray(a))throw 0;cats=a.filter(c=>c&&c.id&&c.name).map(c=>({id:c.id,name:c.name,ids:Array.isArray(c.ids)?c.ids:[]}))}catch(e){try{localStorage.setItem(LKC+'-corrupt',raw)}catch(_){}cats=[]}}
  else{const f=songs.filter(x=>x.fav).map(x=>x.id);if(f.length){cats=[{id:cid(),name:'Favorites',ids:f}];save()}} /* one-time: old star flags become a normal category */
  const ok=new Set(songs.map(x=>x.id));cats.forEach(c=>c.ids=[...new Set(c.ids)].filter(i=>ok.has(i)))})();
function nameErr(n,except){if(!n)return'Enter a category name';if(n.length>30)return'Maximum 30 characters';if(cats.some(c=>c.id!==except&&c.name.toLowerCase()===n.toLowerCase()))return'That name already exists';return''}
function applyCats(id,set){cats.forEach(c=>{const h=c.ids.includes(id);if(set.has(c.id)&&!h)c.ids.push(id);else if(!set.has(c.id)&&h)c.ids=c.ids.filter(x=>x!==id)})}
function delSong(s){songs=songs.filter(x=>x!==s);cats.forEach(c=>c.ids=c.ids.filter(i=>i!==s.id));save()}
const lib={v:'all',id:null},curCat=()=>cats.find(c=>c.id===lib.id);
/* v60: Recent = the last 15 songs opened (device-local); opening a 16th drops the oldest */
const RECK='evolyric-recent-v1',RECN=15;let recent=[];try{recent=JSON.parse(localStorage.getItem(RECK)||'[]').filter(x=>typeof x==='string').slice(0,RECN)}catch(e){}
function recAdd(id){if(!id)return;recent=[id,...recent.filter(x=>x!==id&&songs.some(o=>o.id===x))].slice(0,RECN);try{localStorage.setItem(RECK,JSON.stringify(recent))}catch(e){}}
const recSongs=()=>recent.map(id=>songs.find(s=>s.id===id)).filter(Boolean);
function poolFor(id){const c=id&&cats.find(x=>x.id===id);if(!c)return songs;const S=new Set(c.ids);return songs.filter(x=>S.has(x.id))}
/* v116: a long press only counts when the finger stays put; any swipe/scroll cancels it (and the OS context menu that follows a scroll) */
let scrollAt=0,pressStop=null; /* v130: ONE global scroll listener (it used to be added again for every list row on every redraw, which slowed the app down the longer it ran) */
addEventListener('scroll',()=>{scrollAt=Date.now();if(pressStop)pressStop()},true);
function press(b,tap,hold){let tm,lp=0,x0=0,y0=0,mv=0;const en=()=>clearTimeout(tm);
  b.addEventListener('pointerdown',e=>{lp=0;mv=0;x0=e.clientX;y0=e.clientY;en();pressStop=()=>{mv=1;en()};tm=setTimeout(()=>{if(mv||Date.now()-scrollAt<350)return;lp=1;hold()},500)});
  b.addEventListener('pointermove',e=>{if(!mv&&Math.hypot(e.clientX-x0,e.clientY-y0)>8){mv=1;en()}});
  ['pointerup','pointercancel','pointerleave'].forEach(v=>b.addEventListener(v,()=>{en();pressStop=null}));
  b.addEventListener('contextmenu',e=>{e.preventDefault();en();if(mv||Date.now()-scrollAt<350)return;if(!lp){lp=1;hold()}});
  b.onclick=()=>{if(lp){lp=0;return}tap()}}
/* v153: direction-aware page transitions – Home → Lyrics rises, deeper pages (Editor, settings) slide in from the right, going back slides in from the left */
const VRANK={list:0,play:1,edit:2};
const show=v=>{const fr=document.querySelector('.v.on'),to=document.getElementById(v);if(to&&fr&&fr!==to){const a=VRANK[fr.id]??3,b=VRANK[v]??3;to.dataset.tr=fr.id==='list'&&v==='play'?'up':b>a?'fwd':b<a?'back':'fade'}
  document.querySelectorAll('.v').forEach(e=>e.classList.toggle('on',e.id===v));if(v==='list'&&window.Cloud)Cloud.idle();if(v==='list'&&typeof frNotify==='function')setTimeout(frNotify,350);if(v==='list'&&typeof tourAuto==='function'&&!tourOn())setTimeout(tourAuto,1200)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* v75: colours chosen for the dark theme are darkened for display on the light theme (stored values are untouched) */
const _adc={};
/* v146 – colour tone (Preferences → Appearance): saturation (0 = monochrome), background brightness and contrast.
   A filter over the whole screen would be heavy while scrolling and would break the floating buttons, so instead every colour in the
   stylesheet is recalculated once into an override sheet (#tone), and colours set from script go through tone(). */
let TN={sat:1,bri:0,con:1,hl:true,id:true};
const TONE_RE=/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|rgba?\([^)]*\)/gi,TONE_T=/#[0-9a-f]{3,8}\b|rgba?\(/i;
function toneRGB(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0,s=0,l=(mx+mn)/2;
  if(d){s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6}
  s*=TN.sat;const dark=document.documentElement.dataset.theme!=='light';
  const w=dark?(l<.45?1-l/.45:0):(l>.55?(l-.55)/.45:0);l=Math.min(1,Math.max(0,l+TN.bri*.18*w));l=Math.min(1,Math.max(0,.5+(l-.5)*TN.con));
  const q=l<.5?l*(1+s):l+s-l*s,pp=2*l-q,hu=t=>{t=(t+1)%1;return t<1/6?pp+(q-pp)*6*t:t<.5?q:t<2/3?pp+(q-pp)*(2/3-t)*6:pp};
  return(s?[hu(h+1/3),hu(h),hu(h-1/3)]:[l,l,l]).map(v=>Math.round(v*255))}
function tone(c){if(TN.id||typeof c!=='string'||!TONE_T.test(c))return c;
  return c.replace(TONE_RE,m=>{let r,g,b,a=null;
    if(m[0]==='#'){let x=m.slice(1);if(x.length<5)x=[...x].map(ch=>ch+ch).join('');r=parseInt(x.slice(0,2),16);g=parseInt(x.slice(2,4),16);b=parseInt(x.slice(4,6),16);if(x.length===8)a=+(parseInt(x.slice(6,8),16)/255).toFixed(3)}
    else{const v=m.slice(m.indexOf('(')+1,-1).split(/[\s,\/]+/).filter(Boolean);if(v.length<3||v.slice(0,3).some(t=>/%|[a-z]/i.test(t)))return m;[r,g,b]=v.slice(0,3).map(Number);if(v[3]!=null)a=v[3]}
    const [R,G,B]=toneRGB(r,g,b);return a==null?`rgb(${R},${G},${B})`:`rgba(${R},${G},${B},${a})`})}
function toneCss(){let sh=document.getElementById('tone');if(!sh){sh=document.createElement('style');sh.id='tone';document.head.append(sh)}
  if(TN.id){sh.textContent='';return}
  const base=[...document.styleSheets].find(x=>x.ownerNode&&x.ownerNode.tagName==='STYLE'&&x.ownerNode.id!=='tone');if(!base)return;
  const walk=rules=>{let o='';for(const r of rules){
    if(r.type===1){const st=r.style;let d='';for(let i=0;i<st.length;i++){const p=st[i],v=st.getPropertyValue(p);let nv=null;
        if(p.startsWith('--')&&/^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(v))nv=toneRGB(...v.split(',').map(Number)).join(','); /* rgb triplets such as the aurora's --c */
        else if(TONE_T.test(v))nv=tone(v);
        if(nv!=null&&nv!==v)d+=p+':'+nv+(st.getPropertyPriority(p)?' !important':'')+';'}
      if(d)o+=r.selectorText+'{'+d+'}'}
    else if(r.type===4){const x=walk(r.cssRules);if(x)o+='@media '+r.conditionText+'{'+x+'}'}}return o};
  try{sh.textContent=walk(base.cssRules)}catch(e){sh.textContent=''}}
/* inline colours set from script remember their original in data-tc, so a slider change can recolour them */
function tc(el,c,prop){el.dataset.tc=c;if(prop)el.dataset.tp=prop;el.style[prop||'color']=(el.tagName==='MARK'&&TN.hl)?c:tone(c)}
function toneApply(){const P=PREF;
  TN={sat:Math.max(0,Math.min(100,P.sat==null?100:+P.sat))/100,bri:Math.max(-100,Math.min(100,+P.bri||0))/100,con:1+Math.max(-100,Math.min(100,+P.con||0))/333,hl:P.hlc!==0};
  TN.id=TN.sat===1&&!TN.bri&&TN.con===1;toneCss();document.documentElement.style.setProperty('--tsat',TN.sat);
  document.querySelectorAll('[data-tc]').forEach(el=>{const c=el.dataset.tc,p=el.dataset.tp||'color';el.style[p]=(el.tagName==='MARK'&&TN.hl)?c:tone(c)});
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=tone(document.documentElement.dataset.theme==='light'?'#faf6f0':'#15110e')}
function themeChanged(){toneApply()}
function adapt(c){if(document.documentElement.dataset.theme!=='light'||typeof c!=='string')return c;const m=/^#([0-9a-f]{6})$/i.exec(c);if(!m)return c;if(_adc[c])return _adc[c];
  const v=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16)/255),mx=Math.max(...v),mn=Math.min(...v),d=mx-mn;let h=0,s=0,l=(mx+mn)/2;
  if(d){s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===v[0]?((v[1]-v[2])/d+(v[1]<v[2]?6:0)):mx===v[1]?(v[2]-v[0])/d+2:(v[0]-v[1])/d+4;h/=6}
  const f=(n,k=(n+h*12)%12,a=s*Math.min(l,1-l))=>l-a*Math.max(-1,Math.min(k-3,9-k,1)),lum=(r,g,b)=>{const q=x=>x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4);return .2126*q(r)+.7152*q(g)+.0722*q(b)};
  let out=c;
  if(l>.3||s<.2){l=Math.min(l,.42);if(s<.2)s=Math.min(s,.1);for(;l>.12;l-=.02){const r=f(0),g=f(8),b=f(4),L=lum(r,g,b);if((0.93+.05)/(L+.05)>=4.7){out='#'+[r,g,b].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('');break}}}
  return _adc[c]=out}
const LC={intro:'#fb923c',verse:'#4da3ff','pre-chorus':'#c084fc',chorus:'#ff5d5d',interlude:'#7c83ff',bridge:'#4ade80',coda:'#2dd4bf','sing along':'#f472b6','free style':'#a3e635',male:'#38bdf8',female:'#fb7185','male 1':'#38bdf8','male 2':'#e8a15a','female 1':'#ff7eb6','female 2':'#c4a5ff',all:'#ffd23f','vocal 1':'#38bdf8','vocal 2':'#ff7eb6','vocal 3':'#c4a5ff','vocal 4':'#e8a15a','vocal 5':'#ffd23f',medley:'#e879f9',rit:'#fbbf24',rall:'#f59e0b',
  'post-chorus':'#fb7185',instrumental:'#22d3ee',solo:'#facc15',rap:'#f97316',drop:'#e879f9',outro:'#14b8a6',harmony:'#4ade80',choir:'#ff5d5d','a cappella':'#fde68a','sing-along':'#f472b6','call & response':'#34d399','ad-libs':'#fdba74',improvisation:'#bef264',scat:'#67e8f9',whistle:'#d9f99d',scream:'#ef4444',whisper:'#c4b5fd',spoken:'#cbd5e1',break:'#94a3b8','rit.':'#fbbf24','rall.':'#f59e0b'};
const HC={r:'rgba(255,69,58,.45)',o:'rgba(255,149,0,.5)',y:'rgba(255,214,10,.45)',g:'rgba(48,209,88,.4)',b:'rgba(10,132,255,.45)',i:'rgba(94,92,230,.5)',v:'rgba(191,90,242,.5)'},HLN={r:'Red',o:'Orange',y:'Yellow',g:'Green',b:'Blue',i:'Indigo',v:'Violet'};
const lblColor=(s,lo)=>(lo=lo.replace(/^vokal /,'vocal '),tone(adapt((s.colors&&s.colors[lo])||LC[lo]||LC[lo.replace(/\s*\d+$/,'')]||'#a8a29e')));
/* v90: voice labels (Male 1/2, Female 1/2, All). Written as their own [label] line; right after a section label they are shown beside that section's name,
   and the lyrics up to the next label take the voice colour. Any other label ends it. */
const isGen=lo=>/^vo[ck]al \d+$/.test(lo)||/^(male|female)( \d+)?$/.test(lo)||lo==='all'||lo==='harmony'||lo==='choir'; /* Male/Female/All: older songs; Harmony/Choir: VOICING tags like Vocal N */

