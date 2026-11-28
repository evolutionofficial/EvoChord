/* Account settings (avatar menu) */
function acctOpen(){if(!user)return;closeMenu();show('acct');acctRender()}
function acctRender(){const b=$('#acctbody');b.textContent='';const u=user||{};
  b.append(E('div','sgrp',L('Account','Akun')),sCard(
    sRow('Email',{sub:L('Used to sign in with Google','Dipakai untuk masuk dengan Google'),val:u.email||''}),
    sRow(L('Subscription','Langganan'),{go:()=>docOpen('acct',L('Subscription','Langganan'),docSub)})),
  E('div','sgrp',L('Data','Data')),sCard(sRow(L('Backup & restore','Backup & restore'),{sub:L('Your songs and categories','Lagu dan kategori kamu'),go:()=>docOpen('acct',L('Backup & restore','Backup & restore'),docBackup)})),
  E('div','sgrp',L('Danger zone','Zona berbahaya')),sCard((()=>{const r=sRow(L('Delete account','Hapus akun'),{sub:L('Permanently delete your account and all its data','Hapus akun dan semua datanya secara permanen'),go:()=>docOpen('acct',L('Delete account','Hapus akun'),docDelete)});r.classList.add('danger');return r})()))}
/* v158: delete account – strong warning, Backup first, type a word to unlock the button */
function docDelete(b){b.className='sbody doc';const word=PREF.lang==='id'?'HAPUS':'DELETE';
  const w=E('div','dzw');w.append(E('b','',L('This cannot be undone','Tindakan ini tidak bisa dibatalkan')),E('span','',L('Your EvoChord account and everything in it will be deleted permanently. Nobody, not even Evolution Digital Studio, can bring it back.','Akun EvoChord dan semua isinya akan dihapus permanen. Tidak ada yang bisa mengembalikannya, termasuk Evolution Digital Studio.')));b.append(w);
  b.append(dH(L('What is deleted','Yang dihapus')),dUl([L('All your songs and categories in the cloud and on this device','Semua lagu dan kategorimu di cloud dan di perangkat ini'),L('Your profile, username and bio','Profil, username, dan bio'),L('Your friends, friend requests and songs waiting to be received','Daftar teman, permintaan pertemanan, dan lagu kiriman yang belum diterima'),L('Your sign-in with this Google account','Login EvoChord dengan akun Google ini')]));
  b.append(dH(L('Keep your songs?','Mau menyimpan lagumu?')),dP(L('Make a Backup first. You can restore it later on any device.','Buat Backup dulu. Nanti bisa di-restore di perangkat mana pun.')));
  const bk=E('button','dbtn',L('Backup first','Backup dulu'));bk.type='button';bk.onclick=()=>saveFile('evolyric-backup-'+ymd()+'.evolyric',backupText(),'application/octet-stream',()=>note(L('Backup file saved','File cadangan disimpan')));b.append(bk);
  b.append(dH(L('Confirm','Konfirmasi')));const p=E('p');p.append(L('Type','Ketik')+' ');const wb=E('b','dzword',word);wb.setAttribute('data-nt','');p.append(wb,' '+L('to confirm.','untuk konfirmasi.'));b.append(p);
  const inp=E('input','fld dzin');inp.type='text';inp.autocomplete='off';inp.setAttribute('autocapitalize','characters');inp.setAttribute('autocorrect','off');inp.spellcheck=false;inp.setAttribute('aria-label',L('Type the word to confirm','Ketik kata konfirmasi'));inp.placeholder=word;inp.setAttribute('data-nt','');b.append(inp);
  const go=E('button','dbtn danger',L('Delete my account permanently','Hapus akun saya permanen'));go.type='button';go.disabled=true;b.append(go);
  inp.oninput=()=>{go.disabled=inp.value.trim().toUpperCase()!==word};inp.onkeydown=e=>{if(e.key==='Enter'&&!go.disabled)go.click()};go.onclick=()=>acctDelete(go)}
/* removes this device's copy of the library and the account's local data (preferences such as theme and language stay) */
function wipeLocal(){const keep=new Set(['evo.prefs','evo.tour','evo.bklog']);try{const ks=[];for(let i=0;i<localStorage.length;i++)ks.push(localStorage.key(i));
  ks.forEach(k=>{if(keep.has(k))return;if(/^(evolyric-(v1|cats-v1|recent-v1|queue-v1|sync-v1|mig-v1|seen|uname|bio|auth-hint))|^evo\.lastsong$|^sb-.+-auth-token$/.test(k))localStorage.removeItem(k)})}catch(e){}
  songs.length=0;cats.length=0;recent.length=0;queue.length=0;try{dropTemp()}catch(e){}}
async function acctDelete(go){if(!user||!sb)return note(L('Please sign in again first.','Silakan masuk lagi dulu.'),1);go.disabled=true;go.classList.add('ld');
  try{const{error}=await sb.rpc('delete_my_account');if(error)throw error}
  catch(e){go.disabled=false;go.classList.remove('ld');const m=String((e&&e.message)||''),miss=e&&(e.code==='PGRST202'||e.code==='42883'||/could not find|does not exist/i.test(m));
    return note(miss?L('Account deletion is not switched on on the server yet. Nothing was deleted.','Hapus akun belum diaktifkan di server. Tidak ada yang dihapus.'):L('Your account could not be deleted. Check your connection and try again. Nothing was deleted.','Akun tidak bisa dihapus. Periksa koneksi lalu coba lagi. Tidak ada yang dihapus.'),1)}
  wipeLocal();if(window.Cloud&&Cloud.forget)Cloud.forget();
  uname.v='';uname.state=null;fr.list=[];fr.state=null;fr.t=0;setHint(null);user=null;profSynced=null;
  try{await sb.auth.signOut({scope:'local'})}catch(e){}
  renderAuth();refresh();show('list');gateCheck();note(L('Your account has been deleted.','Akunmu sudah dihapus.'))}
/* generic document page */
let docFrom='help';
function docOpen(from,title,build){docFrom=from;$('#doctitle').textContent=title;const b=$('#docbody');b.textContent='';b.scrollTop=0;build(b);show('doc')}
const dH=t=>E('h2','',t),dP=t=>E('p','',t);
function dUl(a){const u=E('ul');a.forEach(t=>u.append(E('li','',t)));return u}
function dA(txt,href){const a=E('a','',txt);a.href=href;a.target='_blank';a.rel='noopener';return a}
function docAbout(b){b.className='sbody doc roll';b.append(E('div','spc'));
  const w=E('div','lgw');w.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="lgg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffbe6b"/><stop offset="1" stop-color="#e8812a"/></linearGradient></defs><rect width="40" height="40" rx="11" fill="url(#lgg2)"/><g stroke="#15110e" stroke-width="3.2" stroke-linecap="round"><path d="M13 12.5h14" opacity=".45"/><path d="M10 20h20"/><path d="M15 27.5h10" opacity=".45"/></g></svg>';
  let vt=0;const vEl=E('div','big','EvoChord');vEl.onclick=()=>{if(++vt<5)return;vt=0;let lg=[];try{lg=JSON.parse(localStorage.getItem('evo.bklog')||'[]')}catch(e){}const c=csh();c.append(E('h3','','Back log'));const pre=E('pre','',lg.join('\n')||'(empty)');pre.style.cssText='margin:0 6px 10px;max-width:320px;max-height:46vh;overflow:auto;font-size:11px;text-align:left;white-space:pre-wrap';pre.setAttribute('data-nt','');const x=E('button','','Close');x.onclick=ctxClose;const cl=E('button','','Clear');cl.onclick=()=>{try{localStorage.removeItem('evo.bklog')}catch(e){}ctxClose()};c.append(pre,cl,x);$('#ctx').classList.add('on')};
  const t=E('div');const rel=E('div','rel',L('Version','Versi')+' '+APP_REL);rel.setAttribute('data-nt','');t.append(vEl,rel);w.append(t);b.append(w);
  /* v155: About is one short paragraph, then credits and the closing line */
  b.append(dP(L('EvoChord is built by Evolution Digital Studio for vocalists. Lyrics are easy to read on stage, new lyrics can be found in seconds, and editing and customising are quick and simple, so every show runs smoothly and engagingly.','EvoChord dibuat oleh Evolution Digital Studio untuk para vokalis. Lirik jadi mudah dibaca di atas panggung, lirik baru bisa ditemukan dalam hitungan detik, dan pengeditan dan kustomisasi menjadi cepat dan sederhana, sehingga setiap penampilan berjalan lancar dan menarik.')));
  const S=t=>{const d=dP(t);d.style.fontWeight='700';b.append(d)};
  const CR=(role,names)=>{b.append(E('div','cr',role));names.forEach(n=>{const d=E('div','cn',n);d.setAttribute('data-nt','');b.append(d)})};
  CR(L('Concept & Idea','Ide & Konsep'),['Jeffry Ferdian','Windhy Setiawan']);
  CR(L('Design, Programming & Development','Desain, Pemrograman & Pengembangan'),['Jeffry Ferdian']);
  /* Testers credit hidden for now (v100); restore this line to show it again:
  CR(L('Testers','Tester'),['Jeffry Ferdian','Windhy Setiawan','Gandhi Satya','Anya Margaretha','Edo Lasyah','Mytha Ayu','Ozzy Kusuma','Franssella Bella','Win Yovina','Harun Alra']);
  */
  b.append(E('div','cr',''));
  b.append(dP(L('Developed by Evolution Digital Studio.','Developed by Evolution Digital Studio.')));S('Innovation for Musicians. Technology for Creativity.');b.append(E('div','spc'));creditRoll(b)}
/* credits-style auto-scroll for the About page: starts by itself, pauses while you touch/scroll, resumes after a moment, stops at the end */
let crTok=0;
function creditRoll(b){const tok=++crTok;if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let pos=0,last=0,hold=0,started=0;const SPEED=34;
  const pause=()=>{hold=performance.now()+2600};
  ['touchstart','pointerdown','wheel','keydown'].forEach(ev=>b.addEventListener(ev,pause,{passive:true}));
  b.addEventListener('scroll',()=>{if(performance.now()<hold)pos=b.scrollTop},{passive:true});
  const step=t=>{if(tok!==crTok||!$('#doc').classList.contains('on')){if(tok===crTok&&!started){requestAnimationFrame(step)}return}
    if(!started){started=1;last=t;pos=b.scrollTop;hold=t+900}
    const dt=Math.min(.1,(t-last)/1000);last=t;
    if(t>hold){const max=b.scrollHeight-b.clientHeight;if(pos<max){pos=Math.min(max,pos+SPEED*dt);b.scrollTop=pos}else{return}}
    requestAnimationFrame(step)};
  requestAnimationFrame(step)}

function docCredit(b){b.className='sbody doc';
  /* v151: tempo is not in use yet – its credit returns with the feature:
  b.append(dH(L('Tempo data','Data tempo')));const p=E('p');p.append(L('Song tempo data by ','Data tempo lagu oleh '),dA('GetSongBPM.com','https://getsongbpm.com'));b.append(p); */
  b.append(dH(L('Lyrics search','Pencarian lirik')));const q=E('p');q.append(L('Lyrics found with Search the internet come from','Lirik dari Cari di internet berasal dari')+' ',dA('LRCLIB','https://lrclib.net'),L(', a free, open lyrics database. When nothing is found there, the search continues on Google.',', database lirik gratis dan terbuka. Jika tidak ditemukan di sana, pencarian dilanjutkan ke Google.'));b.append(q);
  b.append(dH(L('Fonts','Font')),dUl(['Atkinson Hyperlegible (Braille Institute)','Bricolage Grotesque (Open Font License)','Figtree (Open Font License)']));
  b.append(dH(L('Services','Layanan')),dUl([L('Sign-in and cloud sync: Supabase','Masuk dan sinkron cloud: Supabase'),L('Hosting: Cloudflare','Hosting: Cloudflare')]))}
function docSub(b){b.className='sbody doc';
  const pl=($('#tier')||{}).textContent||'';
  b.append(dH(L('Your plan','Paketmu')),dP(pl||'—'),dP(L('Subscription options are not available yet. Nothing is charged.','Pilihan langganan belum tersedia. Tidak ada tagihan.')))}
/* backup & restore */
function backupText(){return 'EVOLYRIC2'+JSON.stringify({app:'EvoChord',ver:APP_VER,date:new Date().toISOString(),songs,cats})}
function restoreBackup(x){const m=x.match(/^(GULIRLIRIK1|EVOLYRIC1|EVOLYRIC2)\s*/);if(!m)return false;
  try{const raw=JSON.parse(x.slice(m[0].length)),old=Array.isArray(raw),a=old?raw:raw.songs,ca=old?[]:(raw.cats||[]);let n=0;const fresh=[];
    a.forEach(s=>{if(!songs.some(o=>o.id===s.id)){songs.push(s);fresh.push(s);n++}});
    const ok=new Set(songs.map(o=>o.id)),gc=(id,nm)=>{let c=cats.find(k=>k.id===id)||cats.find(k=>k.name.toLowerCase()===nm.toLowerCase());if(!c){c={id:id||cid(),name:nm,ids:[]};cats.push(c)}return c};
    ca.forEach(ic=>{const c=gc(ic.id,cname(ic.name).slice(0,30)||'Category');(ic.ids||[]).forEach(i=>{if(ok.has(i)&&!c.ids.includes(i))c.ids.push(i)})});
    if(old){const f=fresh.filter(o=>o.fav).map(o=>o.id);if(f.length){const c=gc(null,'Favorites');f.forEach(i=>{if(!c.ids.includes(i))c.ids.push(i)})}}
    save();refresh();note(L(n+' songs restored',n+' lagu dipulihkan'));return true}
  catch(_){note(L('Backup could not be read','Cadangan tidak terbaca'),1);return true}}
/* v150: Backup = one .evolyric file with everything; Restore = pick that file; Export .txt = all lyrics in the Apple Notes Shortcut format */
const ymd=()=>{const d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')};
const IOS=(()=>{try{return/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}catch(e){return false}})();
/* iPhone/iPad: the share sheet (Save to Files) is the reliable way out of an installed web app; elsewhere a normal download */
async function saveFile(name,text,type,done){const blob=new Blob([text],{type});
  if(IOS&&navigator.canShare&&window.File){try{const f=new File([blob],name,{type});if(navigator.canShare({files:[f]})){await navigator.share({files:[f]});done&&done();return}}catch(e){if(e&&e.name==='AbortError')return}}
  const u=URL.createObjectURL(blob),a=E('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);done&&done()}
function exportText(){return songs.map(s=>{const t=String(s.title||'Untitled').trim(),l=String(s.lyrics||'').replace(/\s+$/,'');return t+'\n'+l}).join('\n===EVONOTE===\n')+'\n'}
function restoreFile(x){x=String(x||'').replace(/^﻿/,'').trim();if(restoreBackup(x))return true;
  if(EVONOTE.test(x)){const r=evoImport(x,null);save();refresh();evoNote(r);return true}return false}
function docBackup(b){b.className='sbody doc';
  const btn=(t,f,pri)=>{const x=E('button','dbtn'+(pri?' pri':''),t);x.type='button';x.onclick=f;if(t==='Backup'||t==='Restore')x.setAttribute('data-nt','');return x}; /* the names stay Backup / Restore in both languages */
  const fi=E('input');fi.type='file';fi.hidden=true; /* no accept filter: iPhone greys out file types it does not know, such as .evolyric */
  fi.onchange=async()=>{const f=fi.files&&fi.files[0];fi.value='';if(!f)return;let x='';try{x=await f.text()}catch(e){}if(!restoreFile(x))note(L('This is not an EvoChord backup','Ini bukan file cadangan EvoChord'),1)};
  b.append(dP(L('Backup saves all your songs and categories, with their sections, colours and notes, in one .evolyric file. Keep it in Files, iCloud Drive or Google Drive.','Backup menyimpan semua lagu dan kategorimu, lengkap dengan section, warna, dan catatan, dalam satu file .evolyric. Simpan di Files, iCloud Drive, atau Google Drive.')),
    btn(L('Backup','Backup'),()=>saveFile('evolyric-backup-'+ymd()+'.evolyric',backupText(),'application/octet-stream',()=>note(L('Backup file saved','File cadangan disimpan'))),1),
    dP(L('Restore reads a .evolyric file back. Songs that are already on this device are skipped, nothing is overwritten.','Restore membaca kembali file .evolyric. Lagu yang sudah ada di perangkat ini dilewati, tidak ada yang ditimpa.')),
    fi,btn(L('Restore','Restore'),()=>fi.click()),
    dH(L('Export','Ekspor')),
    dP(L('All lyrics as one text file, in the same format as the Apple Notes Shortcut (songs separated by ===EVONOTE===). Open it in any text app, or bring it back with + → Import from file.','Semua lirik dalam satu file teks, dengan format yang sama seperti Shortcut Apple Notes (lagu dipisah ===EVONOTE===). Bisa dibuka di aplikasi teks apa pun, atau dimasukkan lagi lewat + → Impor dari file.')),
    btn(L('Export .txt','Ekspor .txt'),()=>{if(!songs.length)return note(L('No songs to export','Belum ada lagu untuk diekspor'),1);saveFile('evolyric-lyrics-'+ymd()+'.txt',exportText(),'text/plain',()=>note(L(songs.length+' songs exported',songs.length+' lagu diekspor')))}))}
$('#play').classList.toggle('nodim',!PREF.dim);$('#play').classList.toggle('noaura',!PREF.aura);
/* back buttons */
$('#prX').onclick=$('#hpX').onclick=$('#acX').onclick=()=>show('list');
$('#dcX').onclick=()=>{show(docFrom);if(docFrom==='help')helpRender();else if(docFrom==='acct')acctRender()};

