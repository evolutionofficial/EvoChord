/* Preferences */
function prefOpen(){show('prefs');prefRender()}
/* v146: a slider row for the colour tone; the screen recolours while you drag */
function sRng(label,sub,key,min,max,def){const r=E('div','srow srng');const l=E('div','lbl',label);if(sub)l.append(E('small','',sub));
  const v=PREF[key]==null?def:+PREF[key],i=document.createElement('input');i.type='range';i.min=min;i.max=max;i.step=5;i.value=v;i.setAttribute('aria-label',label);
  let raf=0;i.oninput=()=>{PREF[key]=+i.value;if(!raf)raf=requestAnimationFrame(()=>{raf=0;toneApply()})};i.onchange=()=>{prefSave();toneApply();try{refresh()}catch(e){}};
  r.append(l,i);return r}
function prefRender(){const b=$('#prefbody');b.textContent='';
  b.append(E('div','sgrp',L('Appearance','Tampilan')),sCard(sRow(L('Theme','Tema'),{right:sSeg([['auto',L('Auto','Otomatis')],['light',L('Light','Terang')],['dark',L('Dark','Gelap')]],PREF.theme,v=>{PREF.theme=v;prefSave();applyTheme()})}),
    sRng(L('Colour','Warna'),'','sat',0,100,100),
    sRng(L('Background brightness','Kecerahan latar'),null,'bri',-100,100,0),
    sRng(L('Contrast','Kontras'),null,'con',-100,100,0),
    sRow(L('Keep highlight colours','Highlight tetap berwarna'),{sub:L('Coloured marks in the lyrics keep their colour in monochrome','Tanda warna di lirik tetap berwarna saat monokrom'),right:sSwitch(PREF.hlc!==0,on=>{PREF.hlc=on?1:0;prefSave();toneApply()})}),
    sRow(L('Reset colours','Kembalikan warna awal'),{go:()=>{delete PREF.sat;delete PREF.bri;delete PREF.con;delete PREF.hlc;prefSave();toneApply();prefRender()}})));
  b.append(E('div','sgrp',L('Language','Bahasa')),sCard(sRow(L('App language','Bahasa aplikasi'),{right:sSeg([['en','English'],['id','Indonesia']],PREF.lang,v=>{setLang(v)})})));
  b.append(E('div','sgrp',L('Screen','Layar')),sCard(
    sRow(L('Keep screen awake','Layar tetap menyala'),{sub:L('While a song is playing','Saat lagu diputar'),right:sSwitch(!!PREF.awake,setAwakePref)}),
    sRow(L('Fade buttons while scrolling','Redupkan tombol saat menggulir'),{sub:L('Floating buttons nearly disappear during auto-scroll','Tombol melayang hampir hilang saat auto-scroll'),right:sSwitch(!!PREF.dim,setDimPref)}),
    sRow(L('Visual effect while scrolling','Efek visual saat menggulir'),{sub:L('A soft, colour-changing light around the screen edges during auto-scroll','Cahaya lembut berganti warna di tepi layar saat auto-scroll'),right:sSwitch(!!PREF.aura,setAuraPref)}),
    sRow(L('Lite mode','Mode hemat'),{sub:L('Turns off blur, shadows and animations so the app runs smoother on low-end phones','Mematikan blur, bayangan, dan animasi agar aplikasi lebih lancar di HP spek rendah'),right:sSwitch(!!PREF.lite,setLitePref)}),
    sRow(L('Full screen on lyrics','Layar penuh di lirik'),{sub:L('Hides the phone’s status and navigation bars. Turn off to stop Chrome’s “To exit full screen” notice','Menyembunyikan bar status dan navigasi HP. Matikan agar pemberitahuan “To exit full screen” dari Chrome tidak muncul'),right:sSwitch(!!PREF.fscr,setFscrPref)}),
    sRow(L('Text size for new songs','Ukuran teks lagu baru'),{right:sStep(defFont(),20,60,2,v=>{PREF.font=v;prefSave()})})));
  if(!pwaInstalled())b.append(E('div','sgrp',L('App','Aplikasi')),sCard(sRow(L('Install EvoChords','Pasang EvoChords'),{sub:L('Add EvoChords to your Home Screen','Tambahkan EvoChords ke Layar Utama'),go:()=>pwaOffer(null,true)})));
  if(!user)b.append(E('div','sgrp',L('Data','Data')),sCard(sRow(L('Backup & restore','Backup & restore'),{sub:L('Guest: songs are saved on this device only','Tamu: lagu tersimpan di perangkat ini saja'),go:()=>docOpen('prefs',L('Backup & restore','Backup & restore'),docBackup)})))}
/* v102: Tutorial = portrait slide deck (tutorial.js, cached for offline) */
/* the deck (tutorial.js, cached for offline) is shown in a srcdoc iframe; a fresh iframe each time so it adds no Back-history entries */
function tutOpen(){let t=$('#tut');if(!t){t=E('div');t.id='tut';t.setAttribute('role','dialog');t.setAttribute('aria-label','Tutorial');t.setAttribute('data-nt','');document.body.append(t)}
  const show_=()=>{t.textContent='';const f=document.createElement('iframe');f.title='Tutorial';f.srcdoc=window.TUT_HTML(PREF.lang);t.append(f);t.classList.add('on')};
  if(window.TUT_HTML)return show_();
  const sc=document.createElement('script');sc.src='tutorial.js';sc.onload=show_;sc.onerror=()=>note(L('Could not load the tutorial. Check your connection.','Tutorial tidak bisa dimuat. Periksa koneksimu.'),1);document.head.append(sc)}
function tutClose(){const t=$('#tut');if(t){t.classList.remove('on');t.textContent=''}}
addEventListener('message',e=>{const t=$('#tut');if(e.data==='evo-tut-close'&&t&&t.firstChild&&e.source===t.firstChild.contentWindow)tutClose()});
/* v172: tap the EvoChords logo on Home – a small surprise. Each tap plays one of nine short logo/title animations or shows a
   hidden-feature tip; one rare golden animation (about 1 in 60, guaranteed within 80 animations); five quick taps sweep two
   soft stage lights across the screen. Home only, never during a tour, silent, changes no data; calmer with Reduce Motion. */
const EGGK='evo.egg';
const EGG_TIPS=[
 ['Touch the lyrics and slide left or right to change the speed.','Sentuh lirik lalu geser ke kiri atau kanan untuk mengubah kecepatan.'],
 ['While the lyrics run, hold your finger still for 1 second to fast-forward.','Saat lirik berjalan, tahan jari diam 1 detik untuk maju cepat.'],
 ['Pinch the lyrics with two fingers to zoom. Each song remembers its own size.','Cubit lirik dengan dua jari untuk zoom. Ukuran tiap lagu diingat.'],
 ['Double-tap the song title in the lyrics to open the editor.','Ketuk dua kali judul lagu di layar lirik untuk membuka editor.'],
 ['Tap Verse, Chorus or Bridge above the lyrics to jump straight there.','Ketuk Verse, Chorus, atau Bridge di atas lirik untuk langsung loncat ke sana.'],
 ['The L button opens the song you sang last.','Tombol L membuka lagu yang terakhir kamu nyanyikan.'],
 ['Hold a song in the list for more: queue, category, Search online for other versions.','Tahan sebuah lagu di daftar untuk menu lainnya: antrean, kategori, Cari online untuk versi lain.'],
 ['In the editor, Auto Section labels Verse, Chorus and Bridge in one tap.','Di editor, Auto Section memberi label Verse, Chorus, dan Bridge dalam satu ketukan.'],
 ['Copy a note in any app, then + → Paste as new song. Its first line becomes the title.','Salin catatan di aplikasi apa pun, lalu + → Tempel sebagai lagu baru. Baris pertamanya jadi judul.'],
 ['Put songs in the Queue: at the end of the lyrics, Next opens the next one.','Masukkan lagu ke Antrean: di akhir lirik, tombol Next membuka lagu berikutnya.'],
 ['A song always opens paused, so you start when the band starts.','Lagu selalu terbuka dalam keadaan jeda, jadi kamu mulai saat band mulai.'],
 ['Backup makes one .evolyric file with all your songs and categories.','Backup membuat satu file .evolyric berisi semua lagu dan kategorimu.'],
 ['Search forgives typos: “lampu kot” still finds “Lampu Kota”.','Pencarian memaafkan salah ketik: “lampu kot” tetap menemukan “Lampu Kota”.'],
 ['Light theme, colour and the visual effect while scrolling are in Preferences.','Tema terang, warna, dan efek visual saat menggulir ada di Preferensi.']];
const egg={busy:false,taps:[],last:'',tips:[],tipEl:null};
const eggCalm=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}};
function eggState(){try{return JSON.parse(localStorage.getItem(EGGK)||'{}')||{}}catch(e){return {}}}
function eggSave(o){try{localStorage.setItem(EGGK,JSON.stringify(o))}catch(e){}}
function eggOk(){return $('#list').classList.contains('on')&&!tourOn()&&!document.querySelector('#ctx.on,#addbox.on,#slbox.on,#imbox.on,#ipbox.on,#authbox.on,#fabm.on,#drawer.on')}
/* split the title into letter spans for the letter animations, put it back afterwards */
function eggLetters(){const w=$('#list .hd .wm>span');if(!w)return {ls:[],done:()=>{}};if(!egg.orig)egg.orig=w.innerHTML;const ls=[];w.textContent='';
  [['Evo',''],['Chords','g']].forEach(([t,c])=>[...t].forEach(ch=>{const e=E('span','egl'+(c?' '+c:''),ch);w.append(e);ls.push(e)}));
  return {ls,done:()=>{w.innerHTML=egg.orig;if(w.getAttribute('style')==='')w.removeAttribute('style')}}}
const EGG_ANIM={
 eq:G=>Promise.all([...G.querySelectorAll('g path')].map((p,i)=>p.animate([{transform:'scaleX(1)'},{transform:'scaleX('+[.3,1.35,.55][i]+')'},{transform:'scaleX('+[1.3,.4,1.2][i]+')'},{transform:'scaleX(.7)'},{transform:'scaleX(1)'}],{duration:900,delay:i*70,easing:'ease-in-out'}).finished)),
 spin:G=>G.animate([{transform:'rotate(0)'},{transform:'rotate(380deg)',offset:.75},{transform:'rotate(360deg)'}],{duration:850,easing:'cubic-bezier(.3,.7,.3,1)'}).finished,
 hop:G=>G.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(2px) scale(1.15,.82)',offset:.15},{transform:'translateY(-16px) scale(.92,1.1)',offset:.45},{transform:'translateY(0) scale(1.12,.86)',offset:.75},{transform:'translateY(0) scale(1)'}],{duration:750,easing:'ease-out'}).finished,
 stretch:()=>{const w=$('#list .hd .wm>span'),o='0 60%';return w.animate([{transform:'scaleX(1)',transformOrigin:o},{transform:'scaleX(1.4) scaleY(.85)',transformOrigin:o,offset:.35},{transform:'scaleX(.88) scaleY(1.08)',transformOrigin:o,offset:.65},{transform:'scaleX(1.04)',transformOrigin:o,offset:.85},{transform:'scaleX(1)',transformOrigin:o}],{duration:900,easing:'ease-in-out'}).finished},
 collapse:()=>{const t=eggLetters();return Promise.all(t.ls.map((e,i)=>{const r=(i%2?1:-1)*(10+i*4);return e.animate([{transform:'translateY(0) rotate(0)'},{transform:'translateY(26px) rotate('+r+'deg)',offset:.38,easing:'cubic-bezier(.5,0,1,.5)'},{transform:'translateY(22px) rotate('+r+'deg)',offset:.55},{transform:'translateY(-4px) rotate(0)',offset:.85},{transform:'translateY(0) rotate(0)'}],{duration:1300,delay:i*45,easing:'ease-out'}).finished})).then(t.done,t.done)},
 wave:()=>{const t=eggLetters();return Promise.all(t.ls.map((e,i)=>e.animate([{transform:'translateY(0)'},{transform:'translateY(-9px)'},{transform:'translateY(0)'}],{duration:420,delay:i*55,easing:'ease-in-out'}).finished)).then(t.done,t.done)},
 fly:G=>G.animate([{transform:'translate(0,0) rotate(0) scale(1)',opacity:1},{transform:'translate(240px,-70px) rotate(35deg) scale(.6)',opacity:0,offset:.42},{transform:'translate(-90px,20px) rotate(-20deg) scale(.8)',opacity:0,offset:.43},{transform:'translate(6px,0) rotate(4deg) scale(1.05)',opacity:1,offset:.85},{transform:'translate(0,0) rotate(0) scale(1)',opacity:1}],{duration:1300,easing:'ease-in-out'}).finished,
 jelly:G=>G.animate([{transform:'skew(0) scale(1)'},{transform:'skew(-14deg,4deg) scale(1.08,.94)'},{transform:'skew(10deg,-3deg) scale(.95,1.06)'},{transform:'skew(-5deg) scale(1.03,.98)'},{transform:'skew(2deg)'},{transform:'skew(0) scale(1)'}],{duration:800,easing:'ease-out'}).finished,
 flip:G=>G.animate([{transform:'perspective(200px) rotateY(0)'},{transform:'perspective(200px) rotateY(360deg)'}],{duration:850,easing:'cubic-bezier(.4,.1,.2,1)'}).finished};
/* the rare one: a golden logo, the letters burst out and come back, with a few sparks */
function eggGold(G){const t=eggLetters(),r=G.getBoundingClientRect(),sp=[];
  const a1=G.animate([{filter:'none'},{filter:'sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.15) drop-shadow(0 0 10px rgba(255,210,90,.95))',offset:.2},{filter:'sepia(1) saturate(4) hue-rotate(-12deg) brightness(1.15) drop-shadow(0 0 14px rgba(255,210,90,.95))',offset:.8},{filter:'none'}],{duration:2600}).finished;
  const a2=Promise.all(t.ls.map((e,i)=>{const ang=(i/t.ls.length)*Math.PI*2,dx=Math.cos(ang)*60,dy=Math.sin(ang)*34-10;return e.animate([{transform:'translate(0,0) rotate(0)',color:''},{transform:'translate('+dx+'px,'+dy+'px) rotate('+(i*47%360)+'deg) scale(1.2)',offset:.4},{transform:'translate('+dx*.9+'px,'+dy*.9+'px) rotate('+(i*47%360)+'deg) scale(1.2)',offset:.55},{transform:'translate(0,0) rotate(0) scale(1)'}],{duration:2000,delay:300+i*30,easing:'cubic-bezier(.3,.8,.3,1)'}).finished}));
  for(let i=0;i<14;i++){const s=E('i','eggsp');s.style.left=(r.left+r.width/2)+'px';s.style.top=(r.top+r.height/2)+'px';document.body.append(s);sp.push(s);
    const ang=Math.random()*Math.PI*2,d=40+Math.random()*70;s.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:'translate(calc(-50% + '+Math.cos(ang)*d+'px),calc(-50% + '+Math.sin(ang)*d+'px)) scale(.2)',opacity:0}],{duration:900+Math.random()*500,delay:200+Math.random()*300,easing:'cubic-bezier(.2,.7,.4,1)',fill:'both'})}
  eggTip(L('Rare! You found the golden EvoChords.','Langka! Kamu menemukan EvoChords emas.'),'gold',3600);
  return Promise.all([a1,a2]).then(()=>{t.done();sp.forEach(s=>s.remove())},()=>{t.done();sp.forEach(s=>s.remove())})}
function eggTip(text,cls,ms){eggTipX();const h=$('#list .hd h1'),r=h.getBoundingClientRect(),b=E('div','eggtip'+(cls?' '+cls:''));
  if(!cls){b.append(E('b','',L('Did you know?','Tahu nggak?')),E('span','',text))}else b.append(E('span','',text));
  b.style.left=Math.max(10,r.left)+'px';b.style.top=(r.bottom+8)+'px';document.body.append(b);egg.tipEl=b;
  b.animate([{opacity:0,transform:'translateY(-6px) scale(.97)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out',fill:'both'});
  b.onclick=eggTipX;egg.tipT=setTimeout(eggTipX,ms||3400)}
function eggTipX(){clearTimeout(egg.tipT);const b=egg.tipEl;egg.tipEl=null;if(!b)return;
  b.animate([{opacity:1},{opacity:0,transform:'translateY(-4px)'}],{duration:180,fill:'both'}).finished.then(()=>b.remove(),()=>b.remove())}
document.addEventListener('pointerdown',e=>{if(egg.tipEl&&!egg.tipEl.contains(e.target)&&!e.target.closest('#list .hd h1'))eggTipX()},true);
function eggNextTip(){if(!egg.tips.length){egg.tips=EGG_TIPS.map((_,i)=>i).sort(()=>Math.random()-.5)}return EGG_TIPS[egg.tips.shift()]}
/* five quick taps: two soft stage lights sweep across once */
function eggShow(){if(eggCalm())return;const o=E('div','eggbeams');o.append(E('i','a'),E('i','b'));document.body.append(o);
  const run=[o.querySelector('.a').animate([{transform:'translateX(-60vw) rotate(18deg)',opacity:0},{opacity:.9,offset:.25},{opacity:.9,offset:.7},{transform:'translateX(80vw) rotate(-8deg)',opacity:0}],{duration:1700,easing:'ease-in-out',fill:'both'}).finished,
    o.querySelector('.b').animate([{transform:'translateX(70vw) rotate(-18deg)',opacity:0},{opacity:.75,offset:.3},{opacity:.75,offset:.7},{transform:'translateX(-70vw) rotate(10deg)',opacity:0}],{duration:1700,delay:120,easing:'ease-in-out',fill:'both'}).finished];
  Promise.all(run).then(()=>o.remove(),()=>o.remove())}
function eggTap(){if(!eggOk())return;const now=Date.now();egg.taps=egg.taps.filter(t=>now-t<1800);egg.taps.push(now);
  if(egg.taps.length>=5){egg.taps=[];eggTipX();eggShow();return}
  if(egg.busy)return;const G=$('#list .hd svg.lg');if(!G)return;const st=eggState();st.n=(st.n||0)+1;
  if(eggCalm()){egg.busy=true;G.animate([{opacity:1},{opacity:.5},{opacity:1}],{duration:500}).finished.then(()=>egg.busy=false,()=>egg.busy=false);if(st.n%2===0)eggTip(L(...eggNextTip()));eggSave(st);return}
  /* the first tap is always an animation; after that about one tap in three shows a tip */
  if(st.n>1&&Math.random()<.32&&!egg.tipEl){eggSave(st);return eggTip(L(...eggNextTip()))}
  st.a=(st.a||0)+1;st.since=(st.since||0)+1;egg.busy=true;let p;
  if(st.since>=80||Math.random()<1/60){st.since=0;st.gold=(st.gold||0)+1;p=eggGold(G)}
  else{const ks=Object.keys(EGG_ANIM).filter(k=>k!==egg.last),k=ks[Math.floor(Math.random()*ks.length)];egg.last=k;p=Promise.resolve(EGG_ANIM[k](G))}
  eggSave(st);p.then(()=>egg.busy=false,()=>egg.busy=false)}
$('#list .hd h1').addEventListener('click',eggTap);
/* Help */
function helpOpen(){show('help');helpRender()}
function helpRender(){const b=$('#helpbody');b.textContent='';
  b.append(E('div','sgrp',L('Help','Bantuan')),sCard(
    sRow(L('Interactive tour','Tur interaktif'),{go:()=>tourStart()}),
    sRow(L('Quick guide','Panduan singkat'),{go:tutOpen}),
    sRow(L('About EvoChords','Tentang EvoChords'),{go:()=>docOpen('help',L('About','Tentang'),docAbout)}),
    sRow(L('Credit','Kredit'),{go:()=>docOpen('help',L('Credit','Kredit'),docCredit)})),
  E('div','sgrp',L('Support','Dukungan')),sCard(sRow(L('Contact support','Hubungi dukungan'),{sub:SUPPORT_EMAIL,go:()=>docOpen('help',L('Support','Dukungan'),docSupport)})));
  /* v170: Privacy Policy and Terms of Service as small links at the bottom of Help */
  const f=E('div','hfoot'),lk=(t,k)=>{const x=E('button','',t);x.type='button';x.onclick=()=>legalOpen(k,'help');return x};
  f.append(lk(L('Privacy Policy','Kebijakan Privasi'),'privacy'),E('span','',' · '),lk(L('Terms of Service','Ketentuan Penggunaan'),'terms'));b.append(f)}
/* v159: Support – one place to reach Evolution Digital Studio by email */
/* v160: Privacy Policy and Terms of Service (text from docs/legal/*.md, built into legal.js by tools/legal-build.js) */
function legalOpen(kind,from){const t=kind==='privacy'?L('Privacy Policy','Kebijakan Privasi'):L('Terms of Service','Ketentuan Penggunaan');
  if(from==='auth'){closeAuth();from=document.querySelector('.v.on')?document.querySelector('.v.on').id:'list'}
  docOpen(from,t,b=>{b.className='sbody doc legal';const d=E('div');d.setAttribute('data-nt','');const D=window.EVO_LEGAL&&window.EVO_LEGAL[kind];
    if(D)d.innerHTML=D[PREF.lang==='id'?'id':'en'];else d.append(E('p','',L('Open ','Buka ')+location.origin+'/'+kind+'.html'));b.append(d)})}
document.addEventListener('click',e=>{const b=e.target.closest('.lg-t,.lg-p');if(!b)return;const inAuth=!!b.closest('#authbox');legalOpen(b.classList.contains('lg-p')?'privacy':'terms',inAuth?'auth':'welcome')});
$('#wguest').onclick=()=>pwaOffer(guestGo);
setTimeout(movedBanner,600);
const SUPPORT_EMAIL='evolution.studio.id@gmail.com';
function supportMail(subject,extra){const body=[extra||'','','—','EvoChords '+APP_REL+' (build '+APP_VER+')',user&&user.username?'@'+user.username:(uname&&uname.v?'@'+uname.v:''),navigator.userAgent].filter((x,i)=>x||i<2).join('\n');
  return 'mailto:'+SUPPORT_EMAIL+'?subject='+encodeURIComponent(subject||'EvoChords support')+'&body='+encodeURIComponent(body)}
function docSupport(b){b.className='sbody doc';
  b.append(dP(L('Questions, a problem, an idea, or something that is not right with another user? Send us an email. We read every message.','Ada pertanyaan, masalah, ide, atau hal yang tidak beres dengan pengguna lain? Kirim email ke kami. Setiap pesan kami baca.')));
  const a=E('a','dbtn pri',L('Email support','Kirim email ke dukungan'));a.href=supportMail('EvoChords support');a.target='_blank';a.rel='noopener';b.append(a);
  const m=E('p','supm',SUPPORT_EMAIL);m.setAttribute('data-nt','');b.append(m);
  b.append(dH(L('Helpful to include','Sebaiknya sertakan')),dUl([L('What you were doing and what went wrong','Apa yang sedang kamu lakukan dan apa yang salah'),L('A screenshot, if you can','Screenshot, kalau bisa'),L('For a problem with another user: their @username','Untuk masalah dengan pengguna lain: @username-nya')]));
  b.append(dP(L('Your app version and device are added to the email for you.','Versi aplikasi dan jenis perangkatmu otomatis ditambahkan ke email.')))}
