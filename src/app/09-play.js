/* ---------- Play ---------- */
function resetTop(){ /* every opened song starts at the top: scroll, auto-scroll accumulator and sub-pixel offset */
  const L=$('#lyr');pos=0;frac=0;last=0;txtEl.style.transform='';L.scrollTop=0;
  requestAnimationFrame(()=>{if(!playing||pos<2){L.scrollTop=0;pos=0;txtEl.style.transform=''}})}
/* v136 – Web Lyric phase 1: temporary lyrics. A temporary song is shown in the lyrics screen exactly like a library song,
   but it is never put in songs[] — so save(), backup and cloud sync never see it — and it is never written to Recent or to the
   Home "L" (last lyric) button. It disappears when the lyrics screen is left or another song is opened. Save / Edit come in phase 2. */
const isTemp=s=>!!(s&&s._temp);
function lyrNorm(t){
  return String(t==null?'':t).replace(/\r\n?/g,'\n').replace(/[​-‍﻿]/g,'').replace(/ /g,' ')
    .split('\n').filter(l=>!/^\s*\[(ar|ti|al|au|by|length|offset|re|ve|#)\s*:.*\]\s*$/i.test(l)) /* LRC header tags */
    .map(l=>l.replace(/^\s*(\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]\s*)+/,'').replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g,'').replace(/[ \t]+$/,'')) /* LRC time stamps */
    .join('\n').replace(/\n{3,}/g,'\n\n').trim()}
function tempSong(o){o=o||{};const lyr=lyrNorm(o.lyrics),now=Date.now();
  const first=lyr.split('\n').find(l=>l.trim()&&!/^\[.+\]$/.test(l.trim()))||'';
  return{id:'tmp'+now.toString(36)+Math.random().toString(36).slice(2,6),_temp:true,src:o.src||'paste',srcId:o.srcId==null?null:o.srcId,vers:Array.isArray(o.vers)?o.vers:null,
    title:String(o.title||'').trim()||first.trim().slice(0,60)||'Untitled',artist:String(o.artist||'').trim(),key:'',lyrics:lyr,colors:{},
    speed:o.speed||5,font:o.font||defFont(),fav:false,cr:now,md:now}}
/* v137 – Web Lyric phase 3: LRCLIB lookup (https://lrclib.net – free, no key, CORS allowed). Called straight from the browser;
   nothing is scraped and the EvoChord worker is not involved. Not wired to any button yet (phase 4).
   lrcFind(q) -> {state:'ok'|'none'|'offline'|'error'|'empty', items:[{id,title,artist,album,dur,variant,lyrics,synced}]}
   Results are cached for 10 minutes so the globe button can decide instantly (lrcPeek) after lrcPrefetch ran while typing. */
const LRCLIB='https://lrclib.net/api',LRC_MS=7000,LRC_TTL=6e5,lrcCache=new Map();
function lrcNorm(t){return String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/\s*[(\[][^)\]]*[)\]]/g,' ').replace(/\s+-\s+.*$/,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
function lrcScore(r,q){const a=lrcNorm(r.trackName),b=lrcNorm(q);if(!a||!b)return 0;if(a===b)return 3;
  if((' '+b+' ').startsWith(' '+a+' ')||(' '+a+' ').startsWith(' '+b+' '))return 2;
  const A=new Set((a+' '+lrcNorm(r.artistName)).split(' ')),B=b.split(' ');if(B.filter(w=>A.has(w)).length/B.length>=.6)return 1;
  const AW=[...A];return B.filter(w=>A.has(w)||AW.some(x=>fzOk(w,x))).length/B.length>=.6?.75:0} /* v143: typos in the typed title */
const lrcVariant=r=>{const m=/\b(live|remix|acoustic|akustik|unplugged|remaster(?:ed)?|version|versi|cover|karaoke|demo|edit|radio)\b/i.exec((r.trackName||'')+' '+(r.albumName||''));return m?m[1].toLowerCase():''};
/* v143: scorer for the typo retry – every typed word must match (exactly or within the typo limit) and titles covering more of
   the typed words rank first, so "separuh nafs" lists Separuh Nafas before a song called just "Separuh". */
function lrcFzScore(r,q){const B=lrcNorm(q).split(' ').filter(Boolean),T=lrcNorm(r.trackName).split(' '),A=T.concat(lrcNorm(r.artistName).split(' '));if(!B.length)return 0;
  const m=W=>B.filter(w=>W.some(x=>x===w||fzOk(w,x))).length/B.length,all=m(A);return all<.6?0:.5+m(T)}
function lrcPick(list,q,score){score=score||lrcScore;const out=[],seen=new Set();
  (Array.isArray(list)?list:[]).forEach((r,i)=>{if(!r||r.instrumental)return;const lyr=lyrNorm(r.plainLyrics||r.syncedLyrics||'');if(!lyr)return;
    let sc=score(r,q);if(!sc)return;const v=lrcVariant(r);if(v)sc-=.5; /* originals before live / remix / acoustic versions */const sig=lrcNorm(lyr).slice(0,600);if(seen.has(sig))return;seen.add(sig);
    out.push({id:r.id,title:String(r.trackName||'').trim(),artist:String(r.artistName||'').trim(),album:String(r.albumName||'').trim(),dur:Math.round(+r.duration||0),
      variant:v,lyrics:lyr,synced:!r.plainLyrics&&!!r.syncedLyrics,score:sc,i})});
  return out.sort((x,y)=>y.score-x.score||x.i-y.i).slice(0,8)}
async function lrcSearch(q){
  if(navigator.onLine===false)return{state:'offline',items:[]};
  const ac=new AbortController(),to=setTimeout(()=>ac.abort(),LRC_MS);
  try{const r=await fetch(LRCLIB+'/search?q='+encodeURIComponent(q),{signal:ac.signal,credentials:'omit'});
    if(!r.ok)return{state:'error',items:[],status:r.status};
    let items=lrcPick(await r.json(),q);
    /* v143: LRCLIB itself does not forgive typos ("separuh nafs" finds nothing). Then ask again with single words (longest first,
       at most two more requests) and keep only results whose title is close to what was typed. */
    if(!items.length){const ws=[...new Set(lrcNorm(q).split(' ').filter(w=>w.length>=3))].sort((x,y)=>y.length-x.length).slice(0,2);
      for(const w of ws){if(ws.length<2&&w===lrcNorm(q))break;
        const r2=await fetch(LRCLIB+'/search?q='+encodeURIComponent(w),{signal:ac.signal,credentials:'omit'});if(!r2.ok)continue;
        items=lrcPick(await r2.json(),q,lrcFzScore);if(items.length)break}}
    return{state:items.length?'ok':'none',items}}
  catch(e){return{state:navigator.onLine===false?'offline':'error',items:[]}}
  finally{clearTimeout(to)}}
function lrcFind(q){q=String(q||'').trim();const k=lrcNorm(q);if(!k)return Promise.resolve({state:'empty',items:[]});
  const c=lrcCache.get(k);if(c&&Date.now()-c.t<LRC_TTL)return c.res?Promise.resolve(c.res):c.p;
  const p=lrcSearch(q).then(res=>{if(res.state==='ok'||res.state==='none')lrcCache.set(k,{t:Date.now(),res});else lrcCache.delete(k);return res});
  lrcCache.set(k,{t:Date.now(),p});return p}
function lrcPeek(q){const c=lrcCache.get(lrcNorm(q));return c&&c.res&&Date.now()-c.t<LRC_TTL?c.res:null}
let lrcPT=0;function lrcPrefetch(q){clearTimeout(lrcPT);if(lrcNorm(q).length<2)return;lrcPT=setTimeout(()=>{lrcFind(q)},600)}
/* v144 – Auto Section. Lyrics are split into paragraphs (blank lines). Rules (owner's spec):
   - paragraphs with identical or nearly identical words, appearing 2+ times = Chorus (the biggest such group);
     a paragraph made of chorus lines (a half chorus at the end) is Chorus too; the first paragraph can be the Chorus;
   - another repeating group that always comes right before a Chorus and is shorter = Pre-Chorus;
   - a paragraph that does not repeat, after the second Chorus, with a line count unlike the verses = Bridge (one);
   - other non-repeating paragraphs of 2+ lines = Verse 1, 2, …; anything else (intro, ad-lib, outro) gets no label.
   Lines are compared loosely (case, accents, punctuation, s'lalu/selalu and typos up to the search tolerance). */
const secLbl=l=>/^\s*\[[^\]]+\]\s*$/.test(l),secNote=l=>/^\s*\{n[|:]/.test(l);
const asW=l=>fzN(l).replace(/['’`]/g,'').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
function asLine(a,b){const A=asW(a),B=asW(b);if(!A.length||!B.length)return false;const n=Math.max(A.length,B.length);
  let h=0;const U=B.slice();A.forEach(w=>{const i=U.findIndex(x=>x===w||fzOk(w,x)||(w.length>=4&&x.length>=4&&(x.startsWith(w.slice(0,4))&&Math.abs(x.length-w.length)<=2)));if(i>=0){h++;U.splice(i,1)}});return h/n>=.75}
function asSim(P,Q){if(!P.length||!Q.length)return 0;const U=Q.slice();let h=0;P.forEach(l=>{const i=U.findIndex(x=>asLine(l,x));if(i>=0){h++;U.splice(i,1)}});return h/Math.max(P.length,Q.length)}
function asCover(P,C){if(!P.length)return 0;return P.filter(l=>C.some(x=>asLine(l,x))).length/P.length}
/* v145: textual section markers used by lyric sites ("Reff:", "Chorus 2", "Back to reff", "Ulangi reff") become labels */
const SEC_MARK=[[/^(pre[\s-]?(reff?|chorus))$/,'Pre-Chorus'],[/^(reff?|refrain|chorus|korus)(\s*\d+)?$/,'Chorus'],[/^(verse|bait)(\s*\d+)?$/,'Verse'],
  [/^(bridge)(\s*\d+)?$/,'Bridge'],[/^intro$/,'Intro'],[/^(interlude|musik|instrumental|solo)$/,'Interlude'],[/^(outro|coda|ending)$/,'Outro'],
  [/^((back\s*to|kembali\s*ke|ulangi|ulang|repeat|balik\s*ke)\s*(reff?|refrain|chorus))$/,'Chorus']];
function secMark(l){const t=fzN(l).replace(/[()\[\]{}:.*#!-]+/g,' ').replace(/\s+/g,' ').trim();if(!t||t.length>24)return null;
  for(const [re,n] of SEC_MARK){const m=re.exec(t);if(m){const d=(t.match(/\d+/)||[])[0];return n==='Verse'&&d?'Verse '+d:n}}return null}
/* v145 – blocks instead of whole paragraphs. A run of 2+ lines that comes back elsewhere in the song cuts a paragraph, so a verse and
   its chorus written in one paragraph (or lyrics without any blank line) are told apart. Chorus variants (an extra line, a missing
   line) still count as the same chorus; a part that always follows the chorus is part of it (one label); a short ad-lib in front of
   a chorus stays in the chorus. If nothing repeats at all, the lyrics are left alone. */
function autoSec(text){
  const raw=String(text||'').replace(/\r\n?/g,'\n').split('\n'),paras=[];let cur=null,marks=0;
  raw.forEach(l=>{if(!l.trim()){cur=null;return}if(secLbl(l))return;const mk=secMark(l);
    if(mk){marks++;cur={lines:[],mark:mk};paras.push(cur);return}if(!cur){cur={lines:[]};paras.push(cur)}cur.lines.push(l)});
  const T=[];paras.forEach((p,pi)=>p.lines.forEach((l,k)=>{if(!secNote(l))T.push({pi,k,l})}));
  if(T.length<4&&!marks)return null;
  const n=T.length,M=new Map(),mm=(a,b)=>{if(a<0||b<0||a>=n||b>=n||Math.abs(a-b)<2)return false;const key=a<b?a*n+b:b*n+a;if(!M.has(key))M.set(key,asLine(T[a].l,T[b].l));return M.get(key)};
  const run=T.map((_,i)=>{for(let j=0;j<n;j++)if((mm(i,j)&&mm(i+1,j+1)&&T[i+1]&&T[j+1])||(mm(i,j)&&mm(i-1,j-1)&&i>0&&j>0))return true;return false});
  /* blocks: paragraph pieces where "repeats elsewhere" changes */
  const B=[];paras.forEach((p,pi)=>{if(p.mark){B.push({pi,lines:p.lines.slice(),txt:p.lines.filter(l=>!secNote(l)),mark:p.mark,own:true});return}
    let b=null,ti=T.findIndex(t=>t.pi===pi);p.lines.forEach(l=>{const isT=!secNote(l),r=isT?run[ti]:(b?b.run:false);
      /* two repeating runs that touch (a verse's refrain line, then the chorus) are cut apart unless they also come together elsewhere */
      const brk=isT&&r&&b&&b.run&&b.txt.length&&!T.some((_,j)=>mm(ti-1,j)&&mm(ti,j+1));
      if(!b||(isT&&r!==b.run)||brk){b={pi,lines:[],txt:[],run:r};B.push(b)}b.lines.push(l);if(isT){b.txt.push(l);ti++}})});
  const single=paras.length<3;
  /* a 1-2 line piece in front of a repeating piece of the same paragraph (ad-lib) joins it – only when blank lines mark the sections */
  if(!single)for(let i=B.length-2;i>=0;i--){const a=B[i],c=B[i+1];if(!a.run&&!a.mark&&c.run&&a.pi===c.pi&&a.txt.length<=2){c.lines=a.lines.concat(c.lines);c.txt=a.txt.concat(c.txt);B.splice(i,1)}}
  /* when the lyrics do use blank lines, a paragraph is at most "verse, then chorus": everything from its first repeating piece on is one
     block, so a chorus with an extra or changed line stays one chorus */
  if(paras.length>=3)for(let pi=0;pi<paras.length;pi++){const ps=B.filter(x=>x.pi===pi);const r=ps.findIndex(x=>x.run);if(r<0||ps.length-r<2)continue;
    const keep=ps[r];ps.slice(r+1).forEach(x=>{keep.lines.push(...x.lines);keep.txt.push(...x.txt);B.splice(B.indexOf(x),1)})}
  B.forEach(b=>{b.own=b.own||B.filter(x=>x.pi===b.pi).length===1});
  const N=B.length,shared=(a,b)=>a.txt.filter(l=>b.txt.some(x=>asLine(l,x))).length;
  const link=(a,b)=>{if(a.mark||b.mark||a.txt.length<2||b.txt.length<2)return false;const s=shared(a,b);return s>=2&&s>=.5*Math.min(a.txt.length,b.txt.length)};
  const gid=B.map(()=>-1);let g=0;
  for(let i=0;i<N;i++){if(gid[i]>=0)continue;gid[i]=g;const q=[i];while(q.length){const x=q.pop();for(let j=0;j<N;j++)if(gid[j]<0&&link(B[x],B[j])){gid[j]=g;q.push(j)}}g++}
  const groups=[];B.forEach((b,i)=>{(groups[gid[i]]=groups[gid[i]]||[]).push(i)});
  const lab=B.map(b=>b.mark||''),cont=B.map(()=>false);
  const rep=groups.filter(x=>x.length>=2&&x.every(i=>!lab[i]));
  if(!rep.length&&!marks)return null;
  const avg=x=>x.reduce((a,i)=>a+B[i].txt.length,0)/x.length;
  if(rep.length){const ch=rep.slice().sort((a,b)=>b.length-a.length||avg(b)-avg(a)||a[0]-b[0])[0];ch.forEach(i=>lab[i]='Chorus');
    let changed=true;while(changed){changed=false; /* parts that always follow a chorus belong to it */
      rep.forEach(x=>{if(x.some(i=>lab[i]||cont[i]))return;if(x.every(i=>i>0&&(lab[i-1]==='Chorus'||cont[i-1])&&B[i-1].run)){x.forEach(i=>cont[i]=true);changed=true}})}
    const C=[].concat(...ch.map(i=>B[i].txt));
    B.forEach((b,i)=>{if(!lab[i]&&!cont[i]&&b.txt.length>=2&&asCover(b.txt,C)>=.8)lab[i]='Chorus'});
    rep.forEach(x=>{if(x.some(i=>lab[i]||cont[i]))return;if(avg(x)<avg(ch)&&x.every(i=>lab[i+1]==='Chorus'))x.forEach(i=>lab[i]='Pre-Chorus')})}
  const uniq=B.map((b,i)=>i).filter(i=>!lab[i]&&!cont[i]&&groups[gid[i]].length===1&&B[i].txt.length>=2),
    rest=B.map((b,i)=>i).filter(i=>!lab[i]&&!cont[i]&&B[i].txt.length>=2); /* verses may share a line or two (a refrain inside the verse) */
  const ci=lab.map((l,i)=>l==='Chorus'?i:-1).filter(i=>i>=0);
  if(ci.length){
    const pre=uniq.filter(i=>lab[i+1]==='Chorus'),others=uniq.filter(i=>lab[i+1]!=='Chorus'&&ci[0]>i); /* verses before the first chorus */
    if(pre.length>=2&&pre.every(i=>B[i].txt.length===B[pre[0]].txt.length)&&others.length&&others.every(i=>B[i].txt.length!==B[pre[0]].txt.length))pre.forEach(i=>lab[i]='Pre-Chorus');
    const second=ci.length>=2?ci[1]:Infinity,vs=uniq.filter(i=>!lab[i]&&i<second).map(i=>B[i].txt.length);
    const mode=vs.length?vs.slice().sort((a,b)=>vs.filter(v=>v===a).length-vs.filter(v=>v===b).length).pop():null;
    const br=uniq.find(i=>!lab[i]&&i>second&&B[i].own&&mode!=null&&B[i].txt.length!==mode);if(br!=null)lab[br]='Bridge'}
  let v=0;const vn=new Set(lab.filter(l=>/^Verse \d+$/.test(l)).map(l=>+l.slice(6)));
  rest.forEach(i=>{if(lab[i])return;if(single&&i>0&&((rest.includes(i-1)&&/^Verse/.test(lab[i-1]||'')&&!B[i-1].mark)||(lab[i-1]==='Chorus'&&B[i].txt.length<=2))){lab[i]='';cont[i]=true;return} /* no blank lines: one verse until the next chorus; a 1-2 line ad-lib after a chorus stays in it */
    do v++;while(vn.has(v));lab[i]='Verse '+v});
  if(!lab.some(Boolean))return null;
  return paras.map((p,pi)=>B.filter(b=>b.pi===pi).map(b=>{const i=B.indexOf(b);return(lab[i]?'['+lab[i]+']'+(b.lines.length?'\n':''):'')+b.lines.join('\n')}).join('\n')).join('\n\n')}
function openTemp(o){const t=isTemp(o)?o:tempSong(o);if(!t.lyrics)return null;
  if((t.src==='lrclib'||t.src==='google')&&!t.lyrics.split('\n').some(secLbl)){const a=autoSec(t.lyrics);if(a)t.lyrics=a} /* v144 */openSong(t);return t}
function dropTemp(){if(!isTemp(cur))return false;cur=null;$('#txt').textContent='';$('#play').classList.remove('tmp','lrc');vsOpen(false);return true}
/* v137 – phase 2: Save to Library turns the temporary song into a normal library song in place (same screen, same scroll position).
   A song with the same title (and artist, when both have one) asks first, so one tap cannot make silent duplicates. */
function saveTemp(force){const t=cur;if(!isTemp(t))return null;
  const nt=normT(t.title),na=normT(t.artist);
  if(!force&&nt&&songs.some(x=>normT(x.title)===nt&&(!na||!x.artist||normT(x.artist)===na))){
    ask('You already have this song','A song with this title is already in your Library. Save another copy?','Save a copy',()=>{if(cur===t)saveTemp(true)});return null}
  const now=Date.now(),s={id:'s'+now,title:t.title,artist:t.artist,key:'',lyrics:t.lyrics,colors:{},speed:t.speed,font:t.font,fav:false,cr:now,md:now};
  songs.push(s);save();cur=s;recAdd(s.id);try{localStorage.setItem('evo.lastsong',s.id)}catch(e){}
  $('#play').classList.remove('tmp','lrc');vsOpen(false);return s}
/* Edit in Editor: the editor opens as for a new song with these lyrics. Saving there creates the library song; closing it
   (one tap – nothing has been changed yet) goes back to the temporary lyrics. */
function editTemp(){const t=cur;if(!isTemp(t))return;setPlay(false);openEdit(null,t.lyrics,t.title,t,[]);ed.tmp=t;ed.dirty=false}
function openSong(s,keep){
  if(!isTemp(s)){recAdd(s&&s.id);try{localStorage.setItem('evo.lastsong',s.id)}catch(e){}}
  $('#play').classList.toggle('tmp',isTemp(s));$('#play').classList.toggle('lrc',isTemp(s)&&s.src==='lrclib'&&!!s.vers&&s.vers.length>0);if(isTemp(s)&&s.vers)$('#vsbv').textContent=s.vers.length;vsOpen(false);
  if(typeof songFx==='function')songFx();
  const was=playing;cur=s;menuOpen(false);$('#sp').value=s.speed;
  $('#spv').textContent=s.speed;$('#spbv').textContent=s.speed;if(typeof resetInput==='function')resetInput();show('play');render();resetTop();skip.clear();enterFs(); /* v21: straight into fullscreen performance view */
  const f=secEls()[0];startEl=f&&f._stop?f:null;
  setPlay(false); /* a newly opened song is always paused, even if the previous one was auto-scrolling */
  waiting=!!startEl;
  if(waiting)toast('Ketuk layar atau tekan play untuk mulai');hl()}
/* v42: notes. A note is one line of the lyrics text: {n:text} or {n|s=3|w=b|f=s|c=s|a=c|i=1|x=1:text}. Only non-default options are written.
   s size 1-4 (x lyric font), w weight l/r/b, f font ''/s/m/h, c colour a/s/r/g/w/p, a align l/c/r, i italic, x box. */
const NOTE_RE=/^\s*\{n((?:\|[a-z]=[^|:{}]*)*):(.*)\}\s*$/,NOTE_DEF={s:'2',w:'r',f:'',c:'w',a:'c',i:'',x:''};
const NS={'1':.45,'2':.6,'3':.8,'4':1},NW={l:300,r:400,b:700},NF={'':'inherit',s:"Georgia,'Times New Roman',serif",m:"ui-monospace,Menlo,Consolas,monospace",h:"'Bradley Hand','Segoe Print','Marker Felt','Comic Sans MS',cursive"},NC={a:'#f0a04b',s:'#6ab0ff',r:'#ff7a7a',g:'#4ade80',w:'#f3ece3',p:'#c084fc'},NA={l:'left',c:'center',r:'right'};
function noteParse(ln){const m=NOTE_RE.exec(ln||'');if(!m)return null;const o={...NOTE_DEF,t:m[2]};m[1].split('|').forEach(p=>{if(p.length>=3&&p[1]==='='&&p[0] in NOTE_DEF)o[p[0]]=p.slice(2)});return o}
function noteStr(o){const a=[];Object.keys(NOTE_DEF).forEach(k=>{if(o[k]!=null&&o[k]!==NOTE_DEF[k])a.push('|'+k+'='+o[k])});return '{n'+a.join('')+':'+String(o.t).replace(/[\r\n]+/g,' ')+'}'}
function noteStyle(el,o){const st=el.style;st.fontSize=(NS[o.s]||.6)+'em';st.fontWeight=NW[o.w]||400;st.fontFamily=NF[o.f]||'inherit';st.color=adapt(NC[o.c]||NC.w);st.textAlign=NA[o.a]||'center';st.fontStyle=o.i?'italic':'normal';
  if(o.x){st.border='1.5px solid currentColor';st.borderRadius='.45em';st.padding='.12em .7em';st.display='table';st.margin=o.a==='l'?'.4em auto .4em 0':o.a==='r'?'.4em 0 .4em auto':'.4em auto'}
  else{st.border='';st.borderRadius='';st.padding='';st.display='';st.margin='.35em 0'}}
function lineEl(ln,col){
  const d=E('div','ln'),re=/\{([roygbiv]):([^{}]*)\}/g;let i=0,m;
  while((m=re.exec(ln))){if(m.index>i)d.append(ln.slice(i,m.index));const k=E('mark','',m[2]);tc(k,HC[m[1]],'background');d.append(k);i=m.index+m[0].length}
  if(i<ln.length)d.append(ln.slice(i));if(!d.childNodes.length)d.textContent='\u00a0';if(col)d.style.color=col;return d}
/* Chords (secret, beta): an empty inline anchor before character c of a lyric line; the chord name is drawn above it by CSS, so the text, its wrapping and character offsets (annotations, tempo) do not change */
function chordApply(le,items){if(!items||!items.length||!le)return;const by={};items.forEach(it=>{(by[it.l]=by[it.l]||[]).push(it)});
  Object.keys(by).forEach(l=>{const d=le[+l];if(!d||!d.classList||!d.classList.contains('ln'))return;const len=(d.textContent||'').length;if(!len)return;
    by[l].slice().sort((a,b)=>b.c-a.c).forEach(it=>{const c=Math.max(0,Math.min(it.c|0,len-1)),nodes=chNodes(d);
      for(const[nd,o]of nodes){if(c>=o&&c<o+nd.data.length){const a=E('span','chd');a.dataset.c=String(it.n||'');const r=nd.splitText(c-o);r.parentNode.insertBefore(a,r);break}}});
    d.classList.add('hasch')})}
function render(){
  const t=$('#txt'),bar=$('#secs');t.textContent='';bar.textContent='';t.style.fontSize=cur.font+'px';lastA=null;let col='';$('#ptit').toggleAttribute('data-nt',!!cur.title);$('#ptit').textContent=cur.title||'Untitled';fitTitle();t.append(E('div','start'));
  t._le=buildLines(t,cur.lyrics,cur.colors,(d,n,lc)=>{const c=E('button','chip',n);c.style.color=lc;c.onclick=()=>jump(d);d._c=c;bar.append(c)});
  if(CHORD_ON)chordApply(t._le,cur.chords);
  t.append(E('div','end'));t.append(E('div','nxl'));const p=E('div');p.style.height='60vh';t.append(p);SE=secEls();SE.forEach(d=>d._stop=stopOf(cur,d.dataset.k));SO=null;fixPad();watchEnd();qRender()}
function fixPad(){placeQ();if(!cur)return;annPlay();const L=$('#lyr');$('#txt').style.paddingTop='12px';SO=null;fitTitle()}
/* v52: the song title lives in the header above the section selector (fixed, centred) and shrinks to fit */
function fitTitle(){const e=$('#ptit');if(!e||!e.textContent)return;let f=20;e.style.fontSize=f+'px';while(e.scrollWidth>e.clientWidth+1&&f>11){f-=.5;e.style.fontSize=f+'px'}}
window.addEventListener('resize',fixPad);
try{document.fonts.addEventListener('loadingdone',()=>fixPad())}catch(e){}
const secEls=()=>[...$('#txt').querySelectorAll('.sec')];
function hl(){
  const L=$('#lyr'),T=tops(),rl=L.scrollTop+Math.min(RLP(L),(T[0]||0)+L.scrollTop);let a=-1; /* reading line: near the top of the lyrics; at scrollTop 0 it sits at the first section */
  for(let i=0;i<SE.length;i++){if(T[i]<=rl+2)a=i;else break}
  let d=a>=0?SE[a]:null;
  if(jumpD){if(Math.abs(L.scrollTop-jumpTop)<3)d=jumpD;else jumpD=null} /* a tapped chip stays active even when the lyrics cannot scroll any further */
  if(d===lastA)return;
  if(lastA&&lastA._c)lastA._c.classList.remove('on');
  lastA=d;if(d){d._c.classList.add('on');const b=$('#secs');if(performance.now()-secsUser>2500)secsGlide(b,d._c.offsetLeft-(b.clientWidth-d._c.offsetWidth)/2)}}
/* v56: the section strip glides (eased, sub-pixel) to the active chip instead of jumping, and stays put while the user is browsing it */
let sgRaf=0,secsUser=-1e9;
function secsGlide(b,target){cancelAnimationFrame(sgRaf);const max=b.scrollWidth-b.clientWidth;target=Math.max(0,Math.min(max,target));const from=b.scrollLeft,d=target-from;if(Math.abs(d)<1)return;
  const t0=performance.now(),dur=Math.min(650,280+Math.abs(d)*.9),step=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);b.scrollLeft=from+d*e;if(k<1)sgRaf=requestAnimationFrame(step)};sgRaf=requestAnimationFrame(step)}
['pointerdown','touchstart','wheel'].forEach(v=>$('#secs').addEventListener(v,()=>{secsUser=performance.now();cancelAnimationFrame(sgRaf)},{passive:true}));
const RLP=L=>Math.round(Math.min(L.clientHeight*.2,120)); /* reading line: distance from the top of the lyrics */
let jumpD=null,jumpTop=0;
function jump(d){secsUser=-1e9;const L=$('#lyr');L.scrollTop=Math.max(0,d.offsetTop-RLP(L));jumpD=d;jumpTop=L.scrollTop;frac=0;waiting=!playing&&!!d._stop;hl()}
$('#lyr').addEventListener('scroll',()=>{
  if(playing){if(Math.abs($('#lyr').scrollTop-Math.floor(pos))>=1.5){pos=$('#lyr').scrollTop;txtEl.style.transform=''}}
  if(!hlq){hlq=1;requestAnimationFrame(()=>{hlq=0;hl()})}},{passive:true});
let playRaf=0,pos=0,SE=[],SO=null,hlq=0;
const tops=()=>SO||(SO=SE.map(d=>d.offsetTop)); /* cached section offsets: no DOM/layout reads per frame */
const txtEl=$('#txt');txtEl.style.willChange='transform';
function setPlay(on){
  on=!!on;
  if(on===playing)return;
  playing=on;$('#play').classList.toggle('run',on);
  if(on){
    const L=$('#lyr'),rl=L.scrollTop+RLP(L)+3;
    waiting=false;skip.clear();
    secEls().forEach(d=>{if(d.offsetTop<=rl&&d._stop)skip.add(d)});
    last=0;frac=0;bst=0;pos=L.scrollTop;cancelAnimationFrame(playRaf);playRaf=requestAnimationFrame(tick);
    acquireWL();
  }else{
    cancelAnimationFrame(playRaf);playRaf=0;
    if(txtEl.style.transform){const L=$('#lyr');L.scrollTop=Math.round(pos);txtEl.style.transform='';pos=L.scrollTop}
  }
}
