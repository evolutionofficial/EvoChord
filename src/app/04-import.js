/* v140: a text file (or pasted text) made by the Apple Notes shortcut holds many notes separated by ===EVONOTE===.
   Each part becomes its own song: title = its first line (Apple Notes uses the first line as the note title), lyrics = the rest,
   unchanged. File order is kept. A part that is already in the Library word for word (same title and lyrics) is skipped,
   so running the shortcut again never doubles the Library. Files without the marker import as before: one file = one song. */
const EVONOTE=/\s*===EVONOTE===\s*/;
function evoParts(x){
  return String(x).replace(/\r\n?/g,'\n').replace(/[​﻿]/g,'').split(EVONOTE).map(p=>{
    const ls=p.split('\n').map(l=>l.replace(/[ \t ]+$/,''));while(ls.length&&!ls[0].trim())ls.shift();while(ls.length&&!ls[ls.length-1].trim())ls.pop();
    if(!ls.length)return null;
    const first=ls[0].trim(),label=/^\[.+\]$/.test(first);
    const body=label?ls:ls.slice(1);while(body.length&&!body[0].trim())body.shift();
    return{title:label?'':first.slice(0,120),lyrics:body.join('\n')}}).filter(Boolean)}
function evoImport(x,cc){const parts=evoParts(x),now=Date.now();let n=0,skip=0;
  const have=new Set(songs.map(s=>normT(s.title)+'\u0000'+String(s.lyrics||'').trim()));
  parts.forEach((p,i)=>{const title=p.title||'Untitled',k=normT(title)+'\u0000'+p.lyrics.trim();if(have.has(k)){skip++;return}have.add(k);
    const ns={id:'s'+now.toString(36)+i+Math.random().toString(36).slice(2,5),title,artist:'',lyrics:p.lyrics,speed:5,font:defFont(),fav:false,cr:now+i,md:now+i};
    songs.push(ns);if(cc)cc.ids.push(ns.id);n++});
  return{n,skip}}
const evoNote=r=>{const m=r.n+(r.n===1?' song':' songs')+' imported';note(r.skip?m+', '+r.skip+' already in your Library':m)};
$('#file').onchange=async e=>{const fs=[...e.target.files];if(fs.length&&!fs.every(f=>/\.(txt|text)$/i.test(f.name))){e.target.value='';return fileIn(fs)}const cc=lib.v==='cat'&&curCat(),r={n:0,skip:0};let multi=false;
  for(const f of fs){const x=await f.text();
    if(EVONOTE.test(x)){const q=evoImport(x,cc);r.n+=q.n;r.skip+=q.skip;multi=true;continue}
    const ns={id:'s'+Date.now()+Math.random().toString(36).slice(2,5),title:f.name.replace(/\.txt$/i,''),artist:'',lyrics:x,speed:5,font:defFont(),cr:Date.now()};songs.push(ns);if(cc)cc.ids.push(ns.id);r.n++}
  save();refresh();e.target.value='';if(multi)evoNote(r);else toast('Impor selesai')};
document.addEventListener('paste',e=>{
  if(!$('#list').classList.contains('on')||/INPUT|TEXTAREA/.test(e.target.tagName))return;
  const x=e.clipboardData.getData('text');if(!x.trim())return;e.preventDefault();
  if(restoreBackup(x))return;
  if(EVONOTE.test(x)){const r=evoImport(x,lib.v==='cat'&&curCat());save();refresh();evoNote(r);return}
  openEdit(null,x,'',null,lib.v==='cat'?[lib.id]:[])});

/* v163: universal import. Any file a notes app can export (import.js reads .txt .md .html .rtf .docx .enex .json .zip:
   Google Keep Takeout, Simplenote, Evernote, Word, Pages exported as text/Word…). Plain .txt keeps the direct import above.
   A preview (tick the songs, split a document holding many songs) shows only when there is a choice to make. */
const IP_WHY={big:['file too large','file terlalu besar'],bad:['could not be read','tidak bisa dibaca'],badzip:['this .zip could not be opened','file .zip ini tidak bisa dibuka'],nozip:['this device cannot open .zip or Word files – update the system or use .txt','perangkat ini belum bisa membuka file .zip atau Word – perbarui sistemnya atau pakai .txt'],pages:['open it in Pages, then Share → Export → Plain Text or Word','buka di Pages, lalu Bagikan → Ekspor → Teks Biasa atau Word'],doc:['save it as .docx or .txt first','simpan dulu sebagai .docx atau .txt'],unknown:['this file type is not supported','jenis file ini belum didukung'],cnpw:['wrong backup password','kata sandi backup salah'],empty:['no notes found','tidak ada catatan']};
const ipErrText=errs=>errs.slice(0,4).map(x=>x.name.split('/').pop()+': '+L(...(IP_WHY[x.why]||IP_WHY.bad))+(x.info?' ('+x.info+')':'')).join('\n')+(errs.length>4?'\n+'+(errs.length-4):'');
const ipKey=(t,l)=>normT(t||'Untitled')+'\u0000'+String(l||'').trim();
let ip=null;
async function fileIn(fs){if(!window.EvoImport)return note(L('Import is not available. Reload the app.','Impor tidak tersedia. Muat ulang aplikasi.'),1);
  const cc=lib.v==='cat'&&curCat();let r;try{r=await EvoImport.read(fs,{password:(n,again)=>prompt(again?L('Wrong password. Enter the ColorNote backup password:','Kata sandi salah. Masukkan kata sandi backup ColorNote:'):L('This ColorNote backup has a password. Enter it:','Backup ColorNote ini memakai kata sandi. Masukkan kata sandinya:'),'')})}catch(x){r={items:[],errors:fs.map(f=>({name:f.name,why:'bad'}))}}
  if(!r.items.length)return note(r.errors.length?ipErrText(r.errors):L('No lyrics found in this file','Tidak ada lirik di file ini'),1);
  const one=r.items.length===1&&!r.errors.length&&!(r.items[0].doc&&EvoImport.splitDoc(r.items[0].lyrics).length>1);
  ip={items:r.items,errors:r.errors,cat:cc||null,split:false,auto:false,sel:null};ipBuild();
  if(one){if(ip.view[0].dup)return evoNote({n:0,skip:1});return ipSave()}
  ipDraw();$('#ipbox').classList.add('on')}
function ipBuild(){const have=new Set(songs.map(s=>ipKey(s.title,s.lyrics))),seen=new Set();
  ip.view=[];ip.items.forEach(it=>{const parts=ip.split&&it.doc?EvoImport.splitDoc(it.lyrics).map((p,i)=>i===0&&!p.title?{...p,title:it.title}:p):[it];
    parts.forEach(p=>{const k=ipKey(p.title,p.lyrics),dup=have.has(k)||seen.has(k);seen.add(k);ip.view.push({title:p.title,lyrics:p.lyrics,src:it.src,dup,on:!dup})})})}
function ipCount(){const n=ip.view.filter(x=>x.on).length;$('#ipC').textContent=n+(n===1?' song':' songs');$('#ipOK').disabled=!n}
function ipDraw(){$('#ipT').textContent='Import';const o=$('#ipOpt'),box=$('#ipItems');o.textContent='';box.textContent='';
  const opt=(on,txt,fn)=>{const b=E('button','ipo'+(on?' sel':''));b.type='button';b.append(E('span','chk',on?'✓':''),E('span','',txt));b.onclick=fn;o.append(b)};
  const all=ip.view.length&&ip.view.every(x=>x.on);opt(all,L('Select all','Pilih semua'),()=>{ip.view.forEach(x=>x.on=!all);ipDraw()});
  if(ip.items.some(it=>it.doc&&EvoImport.splitDoc(it.lyrics).length>1))opt(ip.split,L('One file holds many songs (split at 2 blank lines)','Satu file berisi banyak lagu (pisah di 2 baris kosong)'),()=>{ip.split=!ip.split;ipBuild();ipDraw()});
  opt(ip.auto,L('Auto Section for lyrics without labels','Auto Section untuk lirik tanpa label'),()=>{ip.auto=!ip.auto;ipDraw()});
  if(ip.cat){const c=E('div','ipn');c.append(L('Into category: ','Masuk ke kategori: '),UE('b','',ip.cat.name));o.append(c)}
  if(ip.errors.length){const e=E('div','iperr',L('Skipped – ','Dilewati – ')+ipErrText(ip.errors));e.setAttribute('data-nt','');o.append(e)}
  ip.view.forEach(it=>{const b=E('button','arow'+(it.on?' sel':''));b.type='button';const m=E('span');
    const sn=it.lyrics.split('\n').filter(l=>l.trim()&&!/^\s*\[.+\]\s*$/.test(l)).slice(0,2).join(' / ').replace(/\{[roygbiv]:([^{}]*)\}/g,'$1');
    m.append(UE('b','',it.title,'Untitled'),UE('small','',sn.slice(0,90),'—'));b.append(E('span','chk',it.on?'✓':''),m);
    if(it.dup)b.append(E('em','','In Library'));b.onclick=()=>{it.on=!it.on;b.classList.toggle('sel',it.on);b.firstChild.textContent=it.on?'✓':'';ipCount();const a=$('#ipOpt .ipo');if(a){const al=ip.view.every(x=>x.on);a.classList.toggle('sel',al);a.firstChild.textContent=al?'✓':''}};box.append(b)});
  ipCount()}
function ipSave(){const now=Date.now(),cc=ip.cat&&cats.includes(ip.cat)?ip.cat:null;let n=0;const skip=ip.view.filter(x=>!x.on&&x.dup).length;
  ip.view.forEach((p,i)=>{if(!p.on)return;let ly=p.lyrics;if(ip.auto&&!ly.split('\n').some(secLbl)){try{const a=autoSec(ly);if(a)ly=a}catch(e){}}
    const ns={id:'s'+now.toString(36)+i+Math.random().toString(36).slice(2,5),title:p.title||'Untitled',artist:'',lyrics:ly,speed:5,font:defFont(),fav:false,cr:now+i,md:now+i};
    songs.push(ns);if(cc)cc.ids.push(ns.id);n++});
  save();refresh();$('#ipbox').classList.remove('on');ip=null;evoNote({n,skip});if(n)listIn&&listIn()}
$('#ipOK').onclick=()=>{if(ip)ipSave()};$('#ipX').onclick=()=>{ip=null;$('#ipbox').classList.remove('on')};
$('#ipbox').onclick=e=>{if(e.target.id==='ipbox')$('#ipX').onclick()};
/* v163: Paste as new song – copy a note in any app, then one tap here (title = its first line) */
function textIn(x,pre){x=String(x||'');if(!x.trim())return false;if(restoreBackup(x))return true;
  if(EVONOTE.test(x)){const r=evoImport(x,lib.v==='cat'&&curCat());save();refresh();evoNote(r);return true}
  const n=EvoImport.fromText(x);openEdit(null,n.lyrics,n.title,null,pre||[]);return true}
async function pasteNew(){fabOpen(false);const pre=lib.v==='cat'?[lib.id]:[];let x=null;
  try{if(navigator.clipboard&&navigator.clipboard.readText)x=await navigator.clipboard.readText()}catch(e){x=null}
  if(x==null){openEdit(null,'','',null,pre);pasteFail();return note(L('Paste the lyrics here','Tempel liriknya di sini'))}
  if(!x.trim())return note(L('Nothing to paste. Copy a note first.','Tidak ada yang bisa ditempel. Salin catatannya dulu.'));
  textIn(x,pre)}
/* v163: Android share target (manifest share_target, GET ./?title=…&text=…&url=…): Share → EvoChord opens the editor with the note */
const SHK='evo.share';
(()=>{let q;try{q=new URLSearchParams(location.search)}catch(e){return}if(!q.has('text')&&!q.has('title')&&!q.has('url'))return;
  const d={title:q.get('title')||'',text:q.get('text')||'',url:q.get('url')||''};try{sessionStorage.setItem(SHK,JSON.stringify(d))}catch(e){window.__evoShare=d}
  try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}})();
function sharePending(){try{if(sessionStorage.getItem(SHK))return true}catch(e){}return !!window.__evoShare}
function shareTake(){let d=window.__evoShare||null;try{const v=sessionStorage.getItem(SHK);if(v)d=JSON.parse(v);sessionStorage.removeItem(SHK)}catch(e){}window.__evoShare=null;if(!d)return false;
  const t=String(d.title||'').trim();let x=String(d.text||'');if(d.url&&!x.includes(d.url))x=(x?x+'\n':'')+d.url;
  if(t&&!x.trim().startsWith(t))x=t+'\n'+x;if(!x.trim())return false;return textIn(x,[])}
{const st=setInterval(()=>{if(!sharePending())return clearInterval(st);if($('#welcome').classList.contains('on')||!$('#list').classList.contains('on')||document.querySelector('#authbox.on'))return;clearInterval(st);shareTake()},400)}

