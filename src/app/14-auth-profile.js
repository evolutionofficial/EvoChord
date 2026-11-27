/* ---------- Google sign-in / profile (Supabase Auth). Guest Demo never requires this. ---------- */
const CFG=window.EVO_CONFIG||{},AUTH_ON=!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY),HK='evolyric-auth-hint';
let sb=null,user=null,authPending=AUTH_ON,profSynced=null;
/* v33: username (profiles.username, see supabase/002_username.sql). state: null = unknown, 'ok', 'nosql' = column not on the server yet */
const UNK='evolyric-uname:',BIOK='evolyric-bio:',uname={v:'',state:null,bio:'',bioState:null};
const unameErr=n=>!n?'Enter a username':n.length<3?'At least 3 characters':n.length>20?'Maximum 20 characters':!/^[a-z0-9._-]+$/.test(n)?'Use only letters, numbers, . _ and -':!/^[a-z0-9]/.test(n)?'Start with a letter or a number':n.includes('..')?'No two dots in a row':['admin','root','support','evolyric','evo','system'].includes(n)?'That username is reserved':'';
function unameLoad(id){try{uname.v=localStorage.getItem(UNK+id)||'';uname.bio=localStorage.getItem(BIOK+id)||''}catch(e){uname.v='';uname.bio=''}}
function bioStore(id,v){uname.bio=v||'';try{v?localStorage.setItem(BIOK+id,v):localStorage.removeItem(BIOK+id)}catch(e){}}
function unameStore(id,v){uname.v=v||'';try{v?localStorage.setItem(UNK+id,v):localStorage.removeItem(UNK+id)}catch(e){}}
async function unameFetch0(n){try{
  let r=await sb.from('profiles').select('username,bio').eq('id',n.id).maybeSingle();
  if(r.error&&(r.error.code==='42703'||/bio/i.test(r.error.message||''))){uname.bioState='nosql';r=await sb.from('profiles').select('username').eq('id',n.id).maybeSingle()}
  else if(!r.error)uname.bioState='ok';
  const{data,error}=r;
  if(error){if(navigator.onLine&&!/fetch|network/i.test(error.message||''))uname.state='nosql';return}
  uname.state='ok';unameStore(n.id,data&&data.username||'');if(uname.bioState==='ok')bioStore(n.id,data&&data.bio||'')}catch(e){}
  if(!$('#amenu').hidden&&user)buildMenu(user);if($('#profile').classList.contains('on'))profRender()}
async function unameFetch(n){await unameFetch0(n);gateCheck(true)}
/* v40: Profile page (username + bio). Opened from the header of the account menu. */
const BIO_MAX=300;
function profOpen(){if(!user)return;closeMenu();show('profile');profRender()}
function profRender(){const body=$('#pfbody');if(!body)return;body.textContent='';
  if(!user){body.append(E('p','mut','Sign in to edit your profile.'));return}
  const top=E('div','pfh'),av=avatarEl(user);top.append(av,UE('b','',user.name),UE('small','mut',user.email));body.append(top);
  const card=E('div','fcard'),nsql=uname.state==='nosql',bsql=uname.bioState==='nosql';
  const l1=E('label','pfl','Username');l1.htmlFor='pfu';const w=E('div','pfu');w.append(E('span','at','@'));
  const iu=E('input');iu.id='pfu';iu.value=uname.v;iu.maxLength=20;iu.placeholder='username';iu.autocapitalize='none';iu.setAttribute('autocorrect','off');iu.spellcheck=false;iu.disabled=nsql;w.append(iu);
  const h1=E('p','mut',nsql?'Usernames are not enabled on the server yet.':'3–20 characters: letters, numbers, . _ and -. Friends find you by this name.');h1.style.cssText='margin:6px 2px 14px;font-size:13px';
  const l2=E('label','pfl','Bio');l2.htmlFor='pfb';const tb=E('textarea');tb.id='pfb';tb.value=uname.bio;tb.maxLength=BIO_MAX;tb.rows=4;tb.disabled=bsql;tb.placeholder='Tell friends about yourself: what you do, your band, your instrument…';
  const cnt=E('div','pfc');const upd=()=>{cnt.textContent=tb.value.length+'/'+BIO_MAX};upd();
  const h2=E('p','mut','Friends and people who find you by your username can read your bio. Your email is never shown.');h2.style.cssText='margin:6px 2px 14px;font-size:13px';
  if(bsql)h2.textContent='Bio is not enabled on the server yet. Run supabase/008_bio.sql in the Supabase SQL Editor.';
  const er=E('p','err');er.id='pfe';const sv=E('button','pill','Save');sv.id='pfs';sv.type='button';sv.style.width='100%';sv.disabled=true;
  const dirty=()=>{const u=iu.value.trim().toLowerCase().replace(/^@/,''),b=tb.value.trim();sv.disabled=!((u!==uname.v&&!nsql)||(b!==uname.bio&&!bsql))};
  iu.oninput=()=>{er.textContent='';dirty()};tb.oninput=()=>{upd();er.textContent='';dirty()};
  sv.onclick=profSave;card.append(l1,w,h1,l2,tb,cnt,h2,er,sv);body.append(card)}
async function profSave(){const sv=$('#pfs');if(!user||!sb||sv.disabled)return;const er=$('#pfe');er.textContent='';
  const u=$('#pfu').value.trim().toLowerCase().replace(/^@/,''),b=$('#pfb').value.trim().slice(0,BIO_MAX),patch={};
  if(u!==uname.v&&uname.state!=='nosql'){const e=uname.v&&!u?'Your username cannot be empty':unameErr(u);if(e)return void(er.textContent=e);patch.username=u}
  if(b!==uname.bio&&uname.bioState!=='nosql')patch.bio=b||null;
  if(!Object.keys(patch).length)return;
  sv.disabled=true;
  try{const{data,error}=await sb.from('profiles').update(patch).eq('id',user.id).select(uname.bioState==='ok'?'username,bio':'username').maybeSingle();
    if(error){const c=error.code;
      er.textContent=c==='23505'?'That username is already taken. Try another one.':c==='42501'?'Your username is locked on the server. Run supabase/007_username_unlock.sql':c==='23514'?'Please check your username and bio.':c==='42703'||c==='PGRST204'?'This is not enabled on the server yet.':navigator.onLine?'Could not save. Try again.':'You are offline';
      sv.disabled=false;return}
    if(!data){er.textContent='Could not save. Try again.';sv.disabled=false;return}
    unameStore(user.id,data.username);if(uname.bioState==='ok')bioStore(user.id,data.bio||'');
    note('Profile saved');profRender()}catch(e){er.textContent='Could not save. Try again.';sv.disabled=false}}
$('#pfX').onclick=()=>show('list');
const getHint=()=>{try{return JSON.parse(localStorage.getItem(HK))}catch(e){return null}};
const setHint=u=>{try{u?localStorage.setItem(HK,JSON.stringify(u)):localStorage.removeItem(HK)}catch(e){}};
const mapUser=u=>{if(!u)return null;const m=u.user_metadata||{};return{id:u.id,name:m.full_name||m.name||(u.email||'').split('@')[0]||'User',email:u.email||m.email||'',avatar:m.avatar_url||m.picture||''}};
const initials=n=>{const w=String(n||'?').trim().split(/\s+/).filter(Boolean);return((w[0]||'?')[0]+(w.length>1?w[w.length-1][0]:'')).toUpperCase()};
function avatarEl(u){const d=E('span','av');const ini=()=>{d.textContent=initials(u.name)};
  if(u.avatar){const i=new Image();i.alt='';i.referrerPolicy='no-referrer';i.onerror=ini;i.src=u.avatar;d.append(i)}else ini();return d}
function renderAuth(){
  const box=$('#auth');box.textContent='';const u=user||(authPending?getHint():null);
  if(!u){const b=E('button','signin','Sign In');b.id='sib';b.onclick=()=>openAuth();box.append(b)}
  else{const b=E('button','avb');b.id='avb';b.setAttribute('aria-haspopup','menu');b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','Account menu: '+u.name);b.append(avatarEl(u));b.onclick=e=>{e.stopPropagation();toggleMenu()};box.append(b)}
  if(!u)closeMenu();frBadge()}
function buildMenu(u){const m=$('#amenu');m.textContent='';
  const h=E('div','mh'),t=E('div');t.append(UE('b','',u.name),UE('small','',u.email));if(uname.v)t.append(E('small','','@'+uname.v));if(window.Cloud&&user){const cs=Cloud.statusText();if(cs)t.append(E('small','cst',cs))}h.append(avatarEl(u),t);m.append(h);
  const it=(l,f,o)=>{const b=E('button','mi'+(o&&o.out?' out':''),l);b.setAttribute('role','menuitem');if(o&&(o.soon||o.lock)){b.disabled=true;b.append(E('em','',o.lock||'Soon'))}else{b.onclick=f;if(o&&o.sub)b.append(E('em','',o.sub))}m.append(b)};
  it('Friends',frOpen,{sub:frAlerts()?String(frAlerts()):''});
  it('Profile Settings',profOpen); /* v149: replaces My Library; the name card above is no longer a button */
  it('Account Settings',acctOpen);
  m.append(E('hr'));it('Sign Out',signOut,{out:1});
  /* v151: tempo is not in use yet – the 'Tempo data by GetSongBPM.com' line returns with the feature:
  const cr=E('div','credit');cr.append('Tempo data by ');const ca=E('a','','GetSongBPM.com');ca.href='https://getsongbpm.com';ca.target='_blank';ca.rel='noopener';cr.append(ca);m.append(cr) */}
function toggleMenu(){$('#amenu').hidden?openMenu():closeMenu()}
function openMenu(){const u=user||getHint();if(!u)return;if(!$('#gmenu').hidden)gmOpen(false); /* v149: never two menus at once */buildMenu(u);$('#amenu').hidden=false;const b=$('#avb');b&&b.setAttribute('aria-expanded','true');const f=$('#amenu .mi:not(:disabled)');f&&f.focus({preventScroll:true})}
function closeMenu(){$('#amenu').hidden=true;const b=$('#avb');b&&b.setAttribute('aria-expanded','false')}
document.addEventListener('click',e=>{if(!$('#amenu').hidden&&!e.target.closest('#amenu'))closeMenu()});
let authFrom=null;
/* v173: optional PWA install is offered before either welcome-screen path begins.
   The pending action is deliberately resumed on every exit so install guidance never blocks Guest or Google sign-in. */
const PWAK='evolyric-pwa-install-declined';
let pwaPrompt=null,pwaNext=null,pwaManual=false,pwaGuide=false;
const pwaIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const pwaInstalled=()=>{try{return !!((window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone)}catch(e){return false}};
/* v174: "Not now" is remembered for 14 days (not forever), so people who said no once are asked again later */
const PWA_WAIT=14*864e5;
const pwaDeclined=()=>{try{const t=+localStorage.getItem(PWAK)||0;return t>1&&Date.now()-t<PWA_WAIT}catch(e){return false}};
const pwaSetDeclined=()=>{try{localStorage.setItem(PWAK,String(Date.now()))}catch(e){}};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();pwaPrompt=e});
addEventListener('appinstalled',()=>{pwaPrompt=null;try{localStorage.removeItem(PWAK)}catch(e){}pwaClose()});
function pwaCopy(){return{title:L('Install EvoChords?','Pasang EvoChords?'),intro:L('Add EvoChords to your Home Screen for faster access.','Tambahkan EvoChords ke Layar Utama agar lebih cepat dibuka.'),yes:L('YES, INSTALL','YA, PASANG'),no:L('Not now','Nanti saja'),continue:L('Continue','Lanjutkan'),ios:[L('Tap the <b>Share</b> button in Safari or Chrome.','Ketuk tombol <b>Bagikan</b> di Safari atau Chrome.'),L('Choose <b>Add to Home Screen</b>.','Pilih <b>Tambahkan ke Layar Utama</b>.'),L('Tap <b>Add</b> to finish.','Ketuk <b>Tambah</b> untuk selesai.')],other:[L('Open your browser menu.','Buka menu browser.'),L('Choose <b>Install app</b> or <b>Add to Home Screen</b>.','Pilih <b>Install app</b> atau <b>Tambahkan ke Layar Utama</b>.')]}}
function pwaRender(guide){const c=pwaCopy(),s=$('#pwaSteps');$('#pwaT').textContent=c.title;$('#pwaM').textContent=guide?L('Follow these steps, then continue to EvoChords.','Ikuti langkah ini, lalu lanjutkan ke EvoChords.'):c.intro;$('#pwaYes').textContent=guide?c.continue:c.yes;$('#pwaNo').textContent=c.no;s.hidden=!guide;s.innerHTML='';if(guide)(pwaIOS()?c.ios:c.other).forEach(x=>{const li=document.createElement('li');li.innerHTML=x;s.append(li)})}
function pwaOpen(guide){pwaGuide=!!guide;pwaRender(guide);const b=$('#pwabox');b.classList.add('on');b.setAttribute('aria-hidden','false');setTimeout(()=>$('#pwaYes').focus({preventScroll:true}),30)}
function pwaResume(){const f=pwaNext;pwaNext=null;if(f)f()}
function pwaClose(){const b=$('#pwabox');b.classList.remove('on');b.setAttribute('aria-hidden','true');pwaManual=false;pwaGuide=false;pwaResume()}
function pwaOffer(next,manual){if(pwaInstalled()){if(next)next();return}if(!manual&&pwaDeclined()){if(next)next();return}pwaNext=next||null;pwaManual=!!manual;pwaOpen(false)}
async function pwaYes(){if(pwaGuide){pwaClose();return}if(pwaIOS()){pwaOpen(true);return}if(pwaPrompt){const e=pwaPrompt;pwaPrompt=null;try{await e.prompt();await e.userChoice}catch(x){}pwaClose();return}pwaOpen(true)}
function pwaNo(){if(!pwaManual)pwaSetDeclined();pwaClose()}
/* v174: signed-in and returning people are offered the install too (before, only the welcome screen did). Quietly, once per visit,
   only on Home, never over the tour, a dialog or the lyrics, and only where the browser can really install (native prompt or iOS). */
let pwaAutoN=0,pwaAutoDone=false;
function pwaAuto(){if(pwaAutoDone||++pwaAutoN>40)return clearInterval(pwaAutoT);
  if(pwaInstalled()||pwaDeclined())return clearInterval(pwaAutoT);
  if(!(pwaPrompt||pwaIOS()))return;
  if(!$('#list').classList.contains('on')||$('#welcome').classList.contains('on')||$('#pwabox').classList.contains('on')||document.querySelector('#authbox.on')||document.body.classList.contains('touring'))return;
  pwaAutoDone=true;clearInterval(pwaAutoT);pwaOffer(null)}
const pwaAutoT=setInterval(pwaAuto,3000);
$('#pwaYes').onclick=pwaYes;$('#pwaNo').onclick=pwaNo;$('#pwabox').onclick=e=>{if(e.target.id==='pwabox')pwaNo()};
function openAuth(err){authFrom=document.activeElement;setBusy(false);$('#aerr').textContent=err||'';const a=$('#authbox');a.classList.add('on');a.setAttribute('aria-hidden','false');setTimeout(()=>$('#gbtn').focus({preventScroll:true}),30)}
function closeAuth(){const a=$('#authbox');a.classList.remove('on');a.setAttribute('aria-hidden','true');authFrom&&authFrom.focus&&authFrom.focus({preventScroll:true})}
function setBusy(on,btn){const g=btn||$('#gbtn');g.disabled=on;g.classList.toggle('ld',on);g.querySelector('span').textContent=on?'Connecting to Google…':'Continue with Google'}
$('#atX').onclick=closeAuth;$('#authbox').onclick=e=>{if(e.target.id==='authbox')closeAuth()};
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('#authbox').classList.contains('on'))closeAuth();else if(!$('#amenu').hidden){closeMenu();const b=$('#avb');b&&b.focus()}});
async function googleGo(btn,errEl,gone){
  errEl.textContent='';
  if(!AUTH_ON)return void(errEl.textContent='Google sign-in is not configured yet.');
  if(!navigator.onLine)return void(errEl.textContent='You appear to be offline. Connect to the internet and try again.');
  setBusy(true,btn);
  try{await ensureClient();
    const{error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}});
    if(error)throw error;
    setTimeout(()=>{if(gone())setBusy(false,btn)},8000) /* if the redirect never happens */
  }catch(e){setBusy(false,btn);errEl.textContent='Sign-in could not start. '+(e&&e.message?e.message:'Please try again.')}}
$('#gbtn').onclick=()=>googleGo($('#gbtn'),$('#aerr'),()=>$('#authbox').classList.contains('on'));
$('#wgbtn').onclick=()=>pwaOffer(()=>googleGo($('#wgbtn'),$('#werr'),()=>$('#welcome').classList.contains('on')));
function loadSDK(){return new Promise((ok,no)=>{if(window.supabase)return ok();const s=document.createElement('script');s.src='vendor/supabase.js';s.onload=ok;s.onerror=()=>no(new Error('Could not load the sign-in module.'));document.head.append(s)})}
let clientP=null;
function ensureClient(){return clientP||(clientP=loadSDK().then(()=>{
  sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}});
  sb.auth.onAuthStateChange((ev,ses)=>{ /* single listener; never call supabase APIs synchronously in here */
    if(ev==='INITIAL_SESSION'||ev==='SIGNED_IN'||ev==='USER_UPDATED'||ev==='TOKEN_REFRESHED'){if(ses&&ses.user)applyUser(ses.user);else if(ev==='INITIAL_SESSION'){if(hasStoredSession())return;applyUser(null)}}
    else if(ev==='SIGNED_OUT')applyUser(null)});
  return sb}).catch(e=>{clientP=null;throw e}))}
function applyUser(u){const was=user&&user.id,n=mapUser(u);authPending=false;user=n;setHint(n);if(n)setGuest(false);renderAuth();movedRefresh();
  if(n){if($('#welcome').classList.contains('on')&&$('#wstep2').hidden)wStep(3)}
  if(n&&was!==n.id&&$('#authbox').classList.contains('on'))closeAuth();
  if(n&&was!==n.id){unameLoad(n.id);setTimeout(susCheck,900)}
  if(n||was)gateCheck();
  if(n&&profSynced!==n.id){profSynced=n.id;setTimeout(()=>syncProfile(n).then(()=>{unameFetch(n);frLoad(true)}),0)}
  if(window.Cloud){if(n)Cloud.signedIn(n);else Cloud.signedOut()}}
async function syncProfile(n){ /* refresh display fields only; row + email are created/owned by the DB trigger, identity comes from the JWT via RLS */
  try{const{error}=await sb.from('profiles').update({display_name:n.name,avatar_url:n.avatar||null}).eq('id',n.id);if(error)console.warn('profile sync:',error.message)}catch(e){console.warn('profile sync failed',e)}}
async function signOut(){closeMenu();susp.on=false;susLock();uname.v='';uname.state=null;fr.list=[];fr.state=null;fr.t=0;if($('#friends').classList.contains('on'))show('list');const had=user;setHint(null);user=null;profSynced=null;renderAuth();gateCheck();
  try{if(sb){if(window.Cloud)await Cloud.flush(4000);await sb.auth.signOut()}note('Signed out')}catch(e){note('Signed out on this device')}}
