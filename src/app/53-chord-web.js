/* ===== Evo Chord: find chords online (Chordtela) =====
   Files 01–17 are EvoLyric as it is. This file replaces the Web Lyric functions of 03-weblyric.js (and openTemp/tempSong/
   saveTemp/textIn of 09 and 04) for Evo Chord: the globe button searches chords on Chordtela, not lyrics on LRCLIB.
   A Chordtela link goes through /api/chordtela; a pasted chord sheet or copied lyrics open as a temporary song. */

function webSearch(q){const a=document.createElement('a');a.href='https://www.google.com/search?q='+encodeURIComponent(q+' chord site:chordtela.com');a.target='_blank';a.rel='noopener noreferrer';a.style.display='none';document.body.append(a);a.click();setTimeout(()=>a.remove(),0)}

function wlGo(q,btn){q=String(q||'').trim();if(!q)return toast('Ketik judul lagu dulu');wlGoogle(q,true)}

function wlBack(q){wlRet=null;const c=csh();c.classList.add('wl');c.append(E('h3','',L('Copied the link?','Sudah salin link-nya?')));
  const p=E('p','mut wlp',L('Copy the Chordtela page link (or the chords), then tap Get chords.','Salin link halaman Chordtela (atau teks chord-nya), lalu tekan Ambil chord.'));c.append(p);
  const ok=E('button','wlok',L('Get chords','Ambil chord'));ok.type='button';ok.onclick=()=>wlClip(q);
  const x=E('button','',L('Back','Kembali'));x.type='button';x.onclick=ctxClose;c.append(ok,x);$('#ctx').classList.add('on')}

function wlClip(q){
  if(!navigator.clipboard||!navigator.clipboard.readText)return wlPaste(q);
  navigator.clipboard.readText().then(x=>chordIn(x,q)).catch(()=>wlPaste(q))}

/* clipboard not readable (permission refused / old browser): a box to paste into by hand */
function wlPaste(q){const c=csh();c.classList.add('wl');c.append(E('h3','',L('Paste the lyrics','Tempel liriknya')));
  const t=document.createElement('textarea');t.className='wlta';t.placeholder=L('Paste the lyrics here','Tempel liriknya di sini');t.rows=6;c.append(t);
  const ok=E('button','wlok',L('Get chords','Ambil chord'));ok.type='button';ok.onclick=()=>chordIn(t.value,q);
  const x=E('button','',L('Back','Kembali'));x.type='button';x.onclick=ctxClose;c.append(ok,x);$('#ctx').classList.add('on');setTimeout(()=>t.focus(),60)}

/* a Chordtela song link anywhere in the text -> its canonical https URL, or null */
const CHORD_URL_RE=/(?:https?:\/\/)?(?:(?:www|m|amp)\.)?chordtela\.com\/\d{4}\/\d{2}\/[a-z0-9-]+\.html(?:\/amp\/?)?/i;
function chordUrlIn(text){const m=CHORD_URL_RE.exec(String(text||''));if(!m)return null;let u=m[0];if(!/^https?:\/\//i.test(u))u='https://'+u;return EvoCore.sheet.normalizeChordtelaUrl(u)}

/* what was copied or pasted: a Chordtela link (fetched), a chord sheet (opened as is), or plain lyrics. Resolves true when a song opened. */
async function chordIn(text,fallbackTitle){
  text=String(text||'');
  const u=chordUrlIn(text);
  if(u){
    note(L('Getting chords…','Mengambil chord…'));
    let res;
    try{res=await fetch('/api/chordtela?url='+encodeURIComponent(u))}
    catch(e){note(L('You are offline. Chords need an internet connection.','Kamu sedang offline. Ambil chord butuh internet.'),true);return false}
    const r=await res.json().catch(()=>({error:'upstream'}));
    const why=r.error||(!res.ok||!r.lyrics?'upstream':'');
    if(why){
      note(why==='bad_url'||why==='not_found'?L('That page was not found on Chordtela.','Halaman itu tidak ditemukan di Chordtela.')
        :why==='no_chords'?L('No chords could be read on that page. Copy the chords as text instead.','Chord di halaman itu belum bisa dibaca. Salin teks chord-nya saja.')
        :L('Chordtela cannot be reached right now.','Chordtela sedang tidak bisa dibuka.'),true);
      return false}
    ctxClose();clearTimeout(noteT);$('#note').classList.remove('on');
    openTemp({title:r.title||fallbackTitle,artist:r.artist,lyrics:r.lyrics,chords:r.chords,key:r.key,capo:r.capo,src:'chordtela',srcId:0,
      vers:(r.versions||[]).map((v,i)=>({...v,id:i,title:r.title,artist:r.artist})),srcUrl:r.source&&r.source.url});
    return true}
  const s=EvoCore.sheet.parseChordSheet(text);
  if(s.chords.length>=2){ctxClose();openTemp({title:s.title||fallbackTitle,artist:s.artist,lyrics:s.lyrics,chords:s.chords,key:s.key,capo:s.capo,src:'paste'});return true}
  const l=wlLyr(text);
  if(!l){note(L('No lyrics copied yet. Copy the lyrics first, then try again.','Belum ada lirik yang disalin. Salin liriknya dulu, lalu coba lagi.'),true);return false}
  ctxClose();openTemp({title:fallbackTitle,lyrics:l,src:'google'});return true}

/* v136 temporary song, now with chords: a chord sheet keeps its key, capo and chord positions (lines are never re-sorted here) */
function tempSong(o){o=o||{};const lyr=lyrNorm(o.lyrics),now=Date.now();
  const first=lyr.split('\n').find(l=>l.trim()&&!/^\[.+\]$/.test(l.trim()))||'';
  return{id:'tmp'+now.toString(36)+Math.random().toString(36).slice(2,6),_temp:true,src:o.src||'paste',srcId:o.srcId==null?null:o.srcId,vers:Array.isArray(o.vers)?o.vers:null,
    title:String(o.title||'').trim()||first.trim().slice(0,60)||'Untitled',artist:String(o.artist||'').trim(),key:o.key||'',capo:o.capo|0,
    /* lyrNorm can drop or merge blank lines: move the chords with their lines */
    chords:Array.isArray(o.chords)&&o.chords.length?EvoCore.remap.remapChords(o.chords,String(o.lyrics||'').replace(/\r\n?/g,'\n'),lyr):[],srcUrl:o.srcUrl||'',lyrics:lyr,colors:{},
    speed:o.speed||5,font:o.font||defFont(),fav:false,cr:now,md:now}}

/* autoSec only for LRCLIB / Google lyrics: a chord sheet's chord positions follow its lines, so its layout is kept as it is */
function openTemp(o){const t=isTemp(o)?o:tempSong(o);if(!t.lyrics)return null;
  if((t.src==='lrclib'||t.src==='google')&&!t.lyrics.split('\n').some(secLbl)){const a=autoSec(t.lyrics);if(a)t.lyrics=a}
  openSong(t);
  if(t.src==='chordtela'&&t.vers&&t.vers.length>1){$('#play').classList.add('lrc');$('#vsbv').textContent=t.vers.length}
  return t}

/* Save to Library: the chords, key and capo come along; a Chordtela song keeps its page link */
function saveTemp(force){const t=cur;if(!isTemp(t))return null;
  const nt=normT(t.title),na=normT(t.artist);
  if(!force&&nt&&songs.some(x=>normT(x.title)===nt&&(!na||!x.artist||normT(x.artist)===na))){
    ask('You already have this song','A song with this title is already in your Library. Save another copy?','Save a copy',()=>{if(cur===t)saveTemp(true)});return null}
  const now=Date.now(),s={id:'s'+now,title:t.title,artist:t.artist,key:t.key||'',capo:t.capo|0,lyrics:t.lyrics,chords:t.chords||[],colors:{},speed:t.speed,font:t.font,fav:false,cr:now,md:now};
  if(t.srcUrl)s.src={site:'chordtela',url:t.srcUrl};
  songs.push(s);save();cur=s;recAdd(s.id);try{localStorage.setItem('evo.lastsong',s.id)}catch(e){}
  $('#play').classList.remove('tmp','lrc');vsOpen(false);return s}

/* the versions panel: LRCLIB versions as before; Chordtela versions show their name and key, and tapping one swaps the chord sheet */
function vsRender(){const l=$('#vsl');l.textContent='';const t=cur;if(!isTemp(t)||!t.vers)return;$('#vsbv').textContent=t.vers.length;
  const ch=t.src==='chordtela';
  t.vers.forEach(it=>{const b=E('button','wlv'+(it.id===t.srcId?' cur':''));b.type='button';if(it.id===t.srcId)b.setAttribute('aria-current','true');
    if(ch){b.append(UE('b','',it.name||L('Chords','Chord')));const sm=E('small');sm.append(UE('span','',L('Key','Nada')+' '+(it.key||'–')));b.append(sm)}
    else{b.append(UE('b','',it.title));const sm=E('small');sm.append(UE('span','',[it.artist,it.album,wlDur(it.dur)].filter(Boolean).join(' · ')));if(it.variant)sm.append(E('i','',it.variant));b.append(sm)}
    b.onclick=()=>{if(it.id===t.srcId)return vsOpen(false);vsOpen(false);
      if(ch)return openTemp({title:cur.title,artist:cur.artist,lyrics:it.lyrics,chords:it.chords,key:it.key,capo:it.capo,src:'chordtela',srcId:it.id,vers:cur.vers,srcUrl:cur.srcUrl,speed:cur.speed,font:cur.font});
      wlOpen(it,t.vers,{speed:t.speed,font:t.font})};l.append(b)})}
function vsOpen(on){const p=$('#vsp'),b=$('#vsb');if(!p)return;if(on==null)on=!p.classList.contains('open');if(on&&!(isTemp(cur)&&(cur.src==='lrclib'||cur.src==='chordtela')&&cur.vers&&cur.vers.length))on=false;
  if(on)vsRender();p.classList.toggle('open',on);b.classList.toggle('hid',on);b.setAttribute('aria-expanded',on?'true':'false')}

/* pasting a note or a link as a new song: a Chordtela link is fetched, a chord sheet opens in the editor with its chords */
function textIn(x,pre){x=String(x||'');if(!x.trim())return false;if(restoreBackup(x))return true;
  if(EVONOTE.test(x)){const r=evoImport(x,lib.v==='cat'&&curCat());save();refresh();evoNote(r);return true}
  if(chordUrlIn(x)){chordIn(x,'');return true}
  const s=EvoCore.sheet.parseChordSheet(x);
  if(s.chords.length>=2){openEdit(null,s.lyrics,s.title||'',null,pre||[]);ed.chords=s.chords;ed.chLyr=ta.value;
    if(s.key&&[...$('#ek').options].some(o=>o.value===s.key))$('#ek').value=s.key;return true}
  const n=EvoImport.fromText(x);openEdit(null,n.lyrics,n.title,null,pre||[]);return true}

/* Evo Chord searches Chordtela through Google (no LRCLIB): the "blocked new tab" fallback says so */
function wlNeedTap(q){const c=csh();c.classList.add('wl');c.append(E('h3','',L('Search Chordtela','Cari di Chordtela')));
  const g=E('button','',L('Search on Google','Cari di Google'));g.type='button';g.onclick=()=>{ctxClose();wlGoogle(q,true)};
  const x=E('button','',L('Cancel','Batal'));x.type='button';x.onclick=()=>{wlRet=null;ctxClose()};c.append(g,x);$('#ctx').classList.add('on')}
