/* v99: open Google in a separate tab with a real link (noopener) — window.open left a blank white page behind the app; query is "<title> lyric" */
function webSearch(q){const a=document.createElement('a');a.href='https://www.google.com/search?q='+encodeURIComponent(q+' lyric');a.target='_blank';a.rel='noopener noreferrer';a.style.display='none';document.body.append(a);a.click();setTimeout(()=>a.remove(),0)}
/* v138 – Web Lyric phases 4 + 5. The globe button (Home and side panel) looks the typed title up on LRCLIB first:
   one match -> straight into the lyrics screen as a temporary song; several -> a short list to pick from; none (or LRCLIB down) -> Google.
   Coming back from Google asks once: "Show lyrics" (reads what was copied) or "Back" (nothing changes, you stay where you were).
   LRCLIB is asked quietly while typing (lrcPrefetch) so the tap can open Google at once – browsers only allow that during the tap. */
let wlRet=null,wlBusy=0;
const wlDur=d=>d>0?Math.floor(d/60)+':'+String(d%60).padStart(2,'0'):'';
function wlOpen(it,items,keep){ctxClose();return openTemp({title:it.title,artist:it.artist,lyrics:it.lyrics,src:'lrclib',srcId:it.id,vers:items||[it],speed:keep&&keep.speed,font:keep&&keep.font})}
/* v141: the versions button (speed corner) re-opens the LRCLIB list of the song on screen, so a wrong pick is one tap to fix.
   Switching keeps speed and zoom; the song stays temporary (Save works as before). */
function vsRender(){const l=$('#vsl');l.textContent='';const t=cur;if(!isTemp(t)||!t.vers)return;$('#vsbv').textContent=t.vers.length;
  t.vers.forEach(it=>{const b=E('button','wlv'+(it.id===t.srcId?' cur':''));b.type='button';if(it.id===t.srcId)b.setAttribute('aria-current','true');
    b.append(UE('b','',it.title));const sm=E('small');sm.append(UE('span','',[it.artist,it.album,wlDur(it.dur)].filter(Boolean).join(' · ')));if(it.variant)sm.append(E('i','',it.variant));b.append(sm);
    b.onclick=()=>{if(it.id===t.srcId)return vsOpen(false);vsOpen(false);wlOpen(it,t.vers,{speed:t.speed,font:t.font})};l.append(b)})}
function vsOpen(on){const p=$('#vsp'),b=$('#vsb');if(!p)return;if(on==null)on=!p.classList.contains('open');if(on&&!(isTemp(cur)&&cur.src==='lrclib'&&cur.vers&&cur.vers.length))on=false;
  if(on)vsRender();p.classList.toggle('open',on);b.classList.toggle('hid',on);b.setAttribute('aria-expanded',on?'true':'false')}
function wlPick(items,q){const c=csh();c.classList.add('wl');const hd=E('div','wlh');hd.append(E('h3','','Choose a version'));
  if(q){const g=E('button','wlg');g.type='button';g.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5a14 14 0 0 1 0 19 14 14 0 0 1 0-19Z"/><path d="M2.5 12h19"/></svg>';g.append('More version');g.onclick=()=>{ctxClose();wlGoogle(q,true)};hd.append(g)} /* v149: same Google button as the versions panel */
  c.append(hd);
  items.forEach(it=>{const b=E('button','wlv');b.type='button';b.append(UE('b','',it.title));
    const m=[it.artist,it.album,wlDur(it.dur)].filter(Boolean).join(' · ');const sm=E('small');sm.append(UE('span','',m));if(it.variant)sm.append(E('i','',it.variant));b.append(sm);b.onclick=()=>wlOpen(it,items);c.append(b)});
  const x=E('button','wlx','Cancel');x.type='button';x.onclick=ctxClose;c.append(x,E('p','wlsrc','Lyrics from LRCLIB'));$('#ctx').classList.add('on')}
function wlUse(q,r,inTap){
  if(r.state==='ok')return r.items.length===1?wlOpen(r.items[0],r.items):wlPick(r.items,q);
  if(r.state==='offline')return note('You are offline. Lyrics search needs an internet connection.',true);
  if(r.state==='empty')return;
  wlGoogle(q,inTap)} /* none / error -> Google */
function wlGoogle(q,inTap){const from=(document.querySelector('.v.on')||{}).id||'list';
  wlRet={q,from,hid:false};webSearch(q);
  /* if the browser blocked the new tab (it never took the page away), offer one tap to open it */
  const r=wlRet;setTimeout(()=>{if(wlRet===r&&!r.hid&&!document.hidden)wlNeedTap(q)},inTap?1800:1200)}
function wlNeedTap(q){const c=csh();c.classList.add('wl');c.append(E('h3','','Not found on LRCLIB'));
  const g=E('button','','Search Google');g.type='button';g.onclick=()=>{ctxClose();wlGoogle(q,true)};
  const x=E('button','','Cancel');x.type='button';x.onclick=()=>{wlRet=null;ctxClose()};c.append(g,x);$('#ctx').classList.add('on')}
function wlBack(q){wlRet=null;const c=csh();c.classList.add('wl');c.append(E('h3','','Copied the lyrics?'));
  const p=E('p','mut wlp','Copy the lyrics on the Google page, then tap Show lyrics.');c.append(p);
  const ok=E('button','wlok','Show lyrics');ok.type='button';ok.onclick=()=>wlClip(q);
  const x=E('button','','Back');x.type='button';x.onclick=ctxClose;c.append(ok,x);$('#ctx').classList.add('on')}
function wlLyr(x){const l=lyrNorm(x);return l.split('\n').filter(t=>t.trim()).length>=2&&l.length>=20&&!/^https?:\/\/\S+$/i.test(l)?l:''}
function wlClip(q){
  if(!navigator.clipboard||!navigator.clipboard.readText)return wlPaste(q);
  navigator.clipboard.readText().then(x=>{const l=wlLyr(x);if(!l)return note('No lyrics copied yet. Copy the lyrics first, then try again.',true);
    ctxClose();openTemp({title:q,lyrics:l,src:'google'})}).catch(()=>wlPaste(q))}
/* clipboard not readable (permission refused / old browser): a box to paste into by hand */
function wlPaste(q){const c=csh();c.classList.add('wl');c.append(E('h3','','Paste the lyrics'));
  const t=document.createElement('textarea');t.className='wlta';t.placeholder='Paste the lyrics here';t.rows=6;c.append(t);
  const ok=E('button','wlok','Show lyrics');ok.type='button';ok.onclick=()=>{const l=wlLyr(t.value);if(!l)return note('No lyrics copied yet. Copy the lyrics first, then try again.',true);ctxClose();openTemp({title:q,lyrics:l,src:'google'})};
  const x=E('button','','Back');x.type='button';x.onclick=ctxClose;c.append(ok,x);$('#ctx').classList.add('on');setTimeout(()=>t.focus(),60)}
document.addEventListener('visibilitychange',()=>{if(!wlRet)return;if(document.hidden){wlRet.hid=true;return}if(wlRet.hid){const q=wlRet.q;setTimeout(()=>wlBack(q),250)}});
function wlGo(q,btn){q=String(q||'').trim();if(!q)return toast('Ketik judul lagu dulu');if(wlBusy)return;
  const r=lrcPeek(q);if(r)return wlUse(q,r,true);
  wlBusy=1;btn&&btn.classList.add('busy');lrcFind(q).then(res=>wlUse(q,res,false)).finally(()=>{wlBusy=0;btn&&btn.classList.remove('busy')})}
$('#q').addEventListener('input',()=>lrcPrefetch($('#q').value));$('#dq').addEventListener('input',()=>lrcPrefetch($('#dq').value));
function fabOpen(on){$('#fabm').classList.toggle('on',!!on);$('#fbg').classList.toggle('on',!!on);$('#fab').setAttribute('aria-expanded',on?'true':'false')}
$('#fab').onclick=()=>fabOpen(!$('#fabm').classList.contains('on'));
$('#fbg').onclick=()=>fabOpen(false); /* tap outside closes the popup */
$('#nw').onclick=()=>{fabOpen(false);openEdit(null,'','',null,lib.v==='cat'?[lib.id]:[])};
$('#imp').onclick=()=>{fabOpen(false);$('#file').click()};
$('#pst').onclick=()=>pasteNew();
$('#slb').onclick=()=>{fabOpen(false);slOpen()};
