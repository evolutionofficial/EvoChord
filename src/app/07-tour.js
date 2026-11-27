/* ---------- v148: interactive tour. A hand shows the gesture, a spotlight marks the place, a card explains it.
   Runs once for new users (empty or sample library) and any time from Help → Interactive tour. It uses a fictional demo song
   that is never saved: the editor is closed without saving and the lyrics screen shows it as a temporary song. ---------- */
const TOURK='evo.tour',TOUR_T='Pulang ke Panggung',TOUR_A='Nada Band';
const TOUR_LY='Lampu panggung mulai menyala\nRuangan hening menunggu kita\n\nPulang, pulang ke panggung\nTempat suaraku bertemu rumah\n\nJalan pulang terasa panjang\nTapi lagu menuntun kita\n\nPulang, pulang ke panggung\nTempat suaraku bertemu rumah\n\nDan bila lampu padam\nKita tetap bernyanyi\nSampai pagi datang\n\nPulang, pulang ke panggung\nTempat suaraku bertemu rumah';
let tour=null;
I18N_KEEP.add(TOUR_T);I18N_KEEP.add(TOUR_A); /* the demo song's title and artist are song data, not interface text */
const tourOn=()=>!!tour;
const tHome=()=>{fabOpen(false);if(!$('#list').classList.contains('on')){refresh();show('list')}};
const TOUR=[
 {h:['Welcome to Evo Chord','Selamat datang di Evo Chord'],d:['A one-minute tour: make a song, tidy it up, then sing it.','Tur satu menit: membuat lagu, merapikannya, lalu menyanyikannya.'],go:tHome},
 {t:'#fab',g:'tap',h:['Add a song','Tambah lagu'],d:['Tap + for New song, Create setlist, Import from file or Paste as new song.','Ketuk + untuk Lagu baru, Buat setlist, Impor dari file, atau Tempel sebagai lagu baru.'],go:tHome},
 {t:'#q',g:'tap',h:['Lyrics from the internet','Lirik dari internet'],d:['Type a title in the search box. Not in your Library? Tap Search the internet: Evo Chord looks on LRCLIB, then Google. Hold a song for Search online to find other versions.','Ketik judul di kolom cari. Tidak ada di Library? Ketuk Cari di internet: Evo Chord mencari di LRCLIB, lalu Google. Tahan sebuah lagu untuk Cari di internet versi lain.'],go:tHome},
 {t:'#ta',g:'tap',p:r=>[r.left+r.width*.45,r.top+Math.min(r.height*.3,120)],h:['The editor','Editor'],d:['Type or paste lyrics here. We use a demo song; it is not saved.','Ketik atau tempel lirik di sini. Kita pakai lagu contoh; lagu ini tidak disimpan.'],
  go:()=>{if(!$('#edit').classList.contains('on')||!tour.ed){openEdit(null,TOUR_LY,TOUR_T);$('#ea').value=TOUR_A;tour.ed=1;if(tour.i>=5)edAuto()}}},
 {t:'#eA',g:'tap',h:['Auto Section','Auto Section'],d:['One tap labels Verse, Chorus and Bridge for you.','Satu ketukan: Verse, Chorus, dan Bridge diberi label otomatis.']},
 {t:'#side',g:'tap',p:r=>[r.left+r.width/2,r.top+Math.min(r.height*.35,190)],h:['Section labels','Label section'],d:['Done: each label sits on its own line, like [Chorus]. To change one, put the cursor on a line and tap a label here.','Selesai: tiap label ada di barisnya sendiri, seperti [Chorus]. Mau ubah? Taruh kursor di baris, lalu ketuk label di sini.'],
  go:()=>{if(!/^\[/m.test(ta.value))edAuto()}},
 {t:'#eS',g:'tap',h:['Save','Simpan'],d:['Save puts the song in your Library. The demo song is not saved.','Simpan memasukkan lagu ke Library. Lagu contoh ini tidak disimpan.']},
 {t:'#lyr',g:'tap',p:r=>[r.left+r.width/2,r.top+r.height*.42],h:['Sing','Mulai menyanyi'],d:['Tap the lyrics to play or pause. A song always opens paused.','Ketuk lirik untuk putar atau jeda. Lagu selalu terbuka dalam keadaan jeda.'],
  go:()=>{if(!$('#play').classList.contains('on')){const v=ta.value;if(ed)ed.dirty=false;openTemp({title:TOUR_T,artist:TOUR_A,lyrics:/^\[/m.test(v)?v:(autoSec(TOUR_LY)||TOUR_LY)})}}},
 {t:'#lyr',g:'swipe',p:r=>[r.left+r.width/2,r.top+r.height*.42],h:['Speed','Kecepatan'],d:['Touch and slide left or right to change the speed.','Sentuh lalu geser ke kiri atau kanan untuk mengubah kecepatan.']},
 {t:'#lyr',g:'hold',p:r=>[r.left+r.width/2,r.top+r.height*.42],h:['Fast forward','Maju cepat'],d:['While it runs, hold your finger still for 1 second to fast-forward.','Saat berjalan, tahan jari diam 1 detik untuk maju cepat.']},
 {t:'#lyr',g:'pinch',p:r=>[r.left+r.width/2,r.top+r.height*.42],h:['Text size','Ukuran teks'],d:['Pinch with two fingers to zoom. Each song keeps its own size.','Cubit dengan dua jari untuk zoom. Ukuran tiap lagu diingat.']},
 {t:'#secs .chip',g:'tap',h:['Jump to a section','Loncat ke section'],d:['Tap Verse, Chorus and so on to go straight to that part.','Ketuk Verse, Chorus, dan lainnya untuk langsung ke bagian itu.']},
 {t:'#spb',g:'tap',h:['Fine speed','Kecepatan halus'],d:['Or set the speed with the slider here.','Atau atur kecepatan dengan slider di sini.']},
 {t:'#ptit',g:'dtap',h:['Edit the song','Edit lagu'],d:['Double-tap the title to open the editor. The ⋮ menu has Edit song too.','Ketuk dua kali judul untuk membuka editor. Menu ⋮ juga punya Edit lagu.']},
 {t:'#qtg',g:'tap',h:['Queue','Antrean'],d:['Next songs wait here. At the end of the lyrics, Next opens the next one.','Lagu berikutnya menunggu di sini. Di akhir lirik, tombol Next membuka lagu berikutnya.']},
 {t:'#gear',g:'tap',h:['You are ready','Siap tampil'],d:['Replay this tour any time: ⚙ → Help → Interactive tour.','Ulangi tur ini kapan saja: ⚙ → Bantuan → Tur interaktif.'],go:()=>{if($('#play').classList.contains('on'))leavePlay();tHome()}}];
const HAND='<svg class="thd" viewBox="0 0 50 50" aria-hidden="true"><path d="M14 27V8a4 4 0 0 1 8 0v12a4 4 0 0 1 8 0v2a4 4 0 0 1 8 0v2a4 4 0 0 1 8 0v9c0 8-6 14-14 14h-4c-5 0-8-2-11-6l-7-9a3.5 3.5 0 0 1 5-5l5 4Z" fill="#fff" stroke="#1a1209" stroke-width="2.2" stroke-linejoin="round"/><path d="M22 20v6M30 22v5M38 24v5" stroke="#1a1209" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
function tourStart(){if(tour)return;try{localStorage.setItem(TOURK,'1')}catch(e){}
  try{gmOpen(false);closeMenu();ctxClose()}catch(e){}
  if($('#play').classList.contains('on'))leavePlay();else if(!$('#list').classList.contains('on')){if(ed)ed.dirty=false;refresh();show('list')}
  const o=E('div');o.id='tour';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-live','polite');
  o.innerHTML='<div class="tsp none"></div><div class="thw" hidden><div class="tmv"><i class="trp"></i><i class="tdt a"></i><i class="tdt b"></i>'+HAND+'</div></div><div class="ttc"><small></small><h4></h4><p></p><div class="tbr"><button type="button" class="tsk"></button><button type="button" class="tbk"></button><button type="button" class="tnx"></button></div></div>';
  document.body.append(o);document.body.classList.add('touring');
  tour={o,i:-1,ed:0};
  o.querySelector('.tsk').onclick=()=>tourEnd();o.querySelector('.tnx').onclick=()=>tGo(tour.i+1);o.querySelector('.tbk').onclick=()=>tGo(tour.i-1);
  o.addEventListener('keydown',e=>{if(e.key==='Escape')tourEnd();else if(e.key==='ArrowRight')tGo(tour.i+1);else if(e.key==='ArrowLeft')tGo(tour.i-1)});
  addEventListener('resize',tPlace);
  requestAnimationFrame(()=>o.classList.add('on'));tGo(0)}
function tGo(i){if(!tour)return;if(i>=TOUR.length)return tourEnd();if(i<0)return;
  /* going back across a screen change re-opens that screen */
  if(i<tour.i){if(i<3&&!$('#list').classList.contains('on')){if($('#play').classList.contains('on'))leavePlay();if(ed)ed.dirty=false;tour.ed=0;tHome()}
    else if(i>=3&&i<7&&!$('#edit').classList.contains('on')){if($('#play').classList.contains('on'))leavePlay();tour.ed=0}}
  tour.i=i;const s=TOUR[i];let wait=30;
  /* every step after a screen change makes sure its screen is there (also when you go back) */
  const scr=i<3?TOUR[0].go:i<7?TOUR[3].go:i<15?TOUR[7].go:s.go;
  try{const was=document.querySelector('.v.on');scr&&scr();s.go&&s.go!==scr&&s.go();if(document.querySelector('.v.on')!==was)wait=420}catch(e){}
  const c=tour.o.querySelector('.ttc');c.style.opacity='0';
  setTimeout(()=>{if(!tour)return;tPlace();c.style.opacity='1';tour.o.querySelector('.tnx').focus({preventScroll:true})},wait)}
function tPlace(){if(!tour||tour.i<0)return;const s=TOUR[tour.i],o=tour.o,n=TOUR.length,vw=innerWidth,vh=innerHeight;
  const el=s.t?document.querySelector(s.t):null;let r=el&&el.getBoundingClientRect();
  if(r&&(!r.width||!r.height||r.bottom<0||r.top>vh))r=null;
  if(r){const l=Math.max(4,r.left),t=Math.max(4,r.top);r={left:l,top:t,right:Math.min(vw-4,r.right),bottom:Math.min(vh-4,r.bottom)};r.width=r.right-r.left;r.height=r.bottom-r.top}
  const sp=o.querySelector('.tsp'),pad=6;
  if(r){sp.classList.remove('none');Object.assign(sp.style,{left:r.left-pad+'px',top:r.top-pad+'px',width:r.width+2*pad+'px',height:r.height+2*pad+'px'})}
  else{sp.classList.add('none');Object.assign(sp.style,{left:vw/2+'px',top:vh/2+'px',width:'0px',height:'0px'})}
  const hw=o.querySelector('.thw');let pt=null;
  if(r&&s.g){pt=s.p?s.p(r):[r.left+r.width/2,r.top+r.height/2];hw.className='thw g-'+s.g;hw.style.left=pt[0]+'px';hw.style.top=pt[1]+'px';hw.hidden=false}else hw.hidden=true;
  const c=o.querySelector('.ttc');
  c.querySelector('small').textContent=(tour.i+1)+' / '+n;c.querySelector('h4').textContent=L(s.h[0],s.h[1]);c.querySelector('p').textContent=L(s.d[0],s.d[1]);
  const sk=c.querySelector('.tsk'),bk=c.querySelector('.tbk'),nx=c.querySelector('.tnx');
  sk.textContent=L('Skip','Lewati');sk.hidden=tour.i===n-1;bk.textContent=L('Back','Kembali');bk.hidden=tour.i===0;
  nx.textContent=tour.i===0?L('Start','Mulai'):tour.i===n-1?L('Done','Selesai'):L('Next','Lanjut');
  const cw=c.offsetWidth,ch=c.offsetHeight,m=12;let top,left;
  if(!r){top=(vh-ch)/2;left=(vw-cw)/2}
  else{const below=Math.max(r.bottom+pad,pt?pt[1]+58:0)+m,above=r.top-pad-m-ch;
    top=below+ch<=vh-m?below:above>=m?above:vh-ch-Math.max(m,24);
    left=Math.min(Math.max(m,r.left+r.width/2-cw/2),vw-cw-m)}
  c.style.top=Math.round(top)+'px';c.style.left=Math.round(left)+'px'}
function tourEnd(){if(!tour)return;const o=tour.o;tour=null;removeEventListener('resize',tPlace);document.body.classList.remove('touring');
  o.classList.remove('on');setTimeout(()=>o.remove(),260);
  if($('#play').classList.contains('on')&&isTemp(cur))leavePlay();
  else if($('#edit').classList.contains('on')){if(ed)ed.dirty=false;refresh();show('list')}
  fabOpen(false)}
/* first run: only for a new user (empty or sample library), once, when Home is free */
function tourAuto(){if(tour)return;let seen='1';try{seen=localStorage.getItem(TOURK)}catch(e){}if(seen)return;
  if(!$('#list').classList.contains('on')||document.querySelector('#authbox.on,#tut.on,#ctx.on,#addbox.on,#slbox.on,#imbox.on,#ipbox.on,#csheet.on'))return;
  if(AUTH_ON&&!user&&!isGuest())return;
  const fresh=!songs.length||(songs.length===1&&JSON.stringify(songs[0])===SAMPLE_J);
  if(!fresh){try{localStorage.setItem(TOURK,'0')}catch(e){}return}
  tourStart()}
