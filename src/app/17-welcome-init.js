/* ---------- v83: welcome / first sign-in, username step, and staying signed in ---------- */
const GK='evolyric-guest';
/* v160: guest mode is back – the app can be used without signing in; songs stay on this device (sign in to sync and use Friends) */
/* v161: EvoChord moved to evolyric.com. On the old address, Home shows how to bring your songs along (data on a phone belongs to one web address). */
const NEW_HOME='https://evolyric.com',OLD_HOST=false; /* EvoChord: the EvoChord "moved" notice never applies here */
/* v169: paused – on 12 Nov 2026 some Indonesian mobile networks could not reach the new evolyric.com yet, so the old address must not push people away. Set MOVED_PAUSE=false to show the banner again. */
const MOVED_PAUSE=true;
function movedBanner(){if(!(OLD_HOST||window.__evoOldHost)||(MOVED_PAUSE&&!window.__evoOldHost)||$('#moved'))return;const w=E('div');w.id='moved';w.setAttribute('role','status');
  const t=E('div','mvt');t.append(E('b','',L('EvoChord has moved to evolyric.com','EvoChord pindah ke evolyric.com')),E('span','',user?L('Open evolyric.com and sign in with the same Google account: your songs come along from the cloud.','Buka evolyric.com lalu masuk dengan akun Google yang sama: lagumu ikut dari cloud.'):L('Guest songs stay on this address. Make a Backup here, then Restore it on evolyric.com.','Lagu tamu tertinggal di alamat ini. Buat Backup di sini, lalu Restore di evolyric.com.')));
  const a=E('a','pill',L('Open evolyric.com','Buka evolyric.com'));a.href=NEW_HOME;a.target='_blank';a.rel='noopener';const r=E('div','mvb');r.append(a);
  if(!user&&songs.length){const bk=E('button','pill',L('Backup','Backup'));bk.type='button';bk.setAttribute('data-nt','');bk.onclick=()=>saveFile('evolyric-backup-'+ymd()+'.evolyric',backupText(),'application/octet-stream',()=>note(L('Backup file saved','File cadangan disimpan')));r.append(bk)}
  w.append(t,r);const tabs=$('#tabs');tabs.parentNode.insertBefore(w,tabs)}
function movedRefresh(){const m=$('#moved');if(m)m.remove();movedBanner()}
const isGuest=()=>{try{return localStorage.getItem(GK)==='1'}catch(e){return false}},setGuest=on=>{try{on?localStorage.setItem(GK,'1'):localStorage.removeItem(GK)}catch(e){}};
function guestGo(){setGuest(true);refresh();show('list');note(L('Guest mode: your songs are saved on this device only. Sign in any time to sync.','Mode tamu: lagumu tersimpan di perangkat ini saja. Masuk kapan saja untuk sinkron.'))}
const hasStoredSession=()=>{try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/^sb-.+-auth-token$/.test(k)&&localStorage.getItem(k))return true}}catch(e){}return false};
function wStep(n){$('#wstep1').hidden=n!==1;$('#wstep2').hidden=n!==2;$('#wstep3').hidden=n!==3;if(n===2)setTimeout(()=>$('#wun').focus({preventScroll:true}),60)}
function showWelcome(n){wStep(n);closeMenu();show('welcome')}
function gateCheck(fetched){
  if(!AUTH_ON)return;
  const on=$('#welcome').classList.contains('on');
  if(user){
    if(uname.state==='ok'&&!uname.v){if(!on||$('#wstep2').hidden)showWelcome(2);return}
    if(on&&(uname.v||uname.state==='nosql'||fetched||!navigator.onLine))show('list');
    return}
  if(authPending||getHint())return;
  if(isGuest()){if(on)show('list');return}
  if(!on)showWelcome(1)}
$('#wout').onclick=()=>signOut();
const wuIn=$('#wun'),wuSave=$('#wusave'),wuErr=$('#wuerr');
const wuNorm=()=>wuIn.value.trim().toLowerCase().replace(/^@/,'');
wuIn.oninput=()=>{const u=wuNorm(),e=u?unameErr(u):'';wuErr.textContent=e;wuSave.disabled=!u||!!e};
wuIn.onkeydown=e=>{if(e.key==='Enter'&&!wuSave.disabled)wuSave.click()};
wuSave.onclick=async()=>{const u=wuNorm(),e=unameErr(u);if(e)return void(wuErr.textContent=e);if(!user||!sb)return void(wuErr.textContent='Please sign in again.');
  wuSave.disabled=true;wuErr.textContent='';
  try{const{data,error}=await sb.from('profiles').update({username:u}).eq('id',user.id).select('username').maybeSingle();
    if(error||!data){const c=error&&error.code;wuErr.textContent=c==='23505'?'That username is already taken. Try another one.':c==='42501'?'Your username is locked on the server. Run supabase/007_username_unlock.sql':c==='23514'?'Please check your username and bio.':navigator.onLine?'Something went wrong. Try again.':'You appear to be offline. Connect to the internet and try again.';wuSave.disabled=false;return}
    unameStore(user.id,data.username);gateCheck(true)}
  catch(x){wuErr.textContent='Something went wrong. Try again.';wuSave.disabled=false}};
async function initAuth(){
  /* surface OAuth errors returned in the URL */
  const qs=new URLSearchParams(location.search),hs=new URLSearchParams(location.hash.replace(/^#/,'')),er=qs.get('error_description')||hs.get('error_description');
  if(er){try{history.replaceState(null,'',location.pathname)}catch(e){}}
  const back=!!(qs.get('code')||hs.get('access_token'));
  try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){} /* ask the browser not to evict the saved login */
  if(AUTH_ON&&!getHint()&&!(isGuest()&&!back)){showWelcome(back&&!er?3:1);if(er)$('#werr').textContent=er}
  renderAuth();
  if(!AUTH_ON){setHint(null);if(window.Cloud)Cloud.signedOut();if(er)openAuth(er);return}
  try{await ensureClient();const{data,error}=await sb.auth.getSession();if(error)throw error;applyUser(data.session?data.session.user:null)}
  catch(e){authPending=false;const h=getHint();
    if(h){user=h;unameLoad(h.id);renderAuth()} /* could not reach the server: stay signed in with the saved login */
    else{user=null;renderAuth();if(window.Cloud)Cloud.signedOut();gateCheck()}}
  if(er&&!$('#welcome').classList.contains('on'))openAuth(er)}
/* v41: Android Back button. In the installed app a stray Back press used to close EvoChord. Now Back closes the open panel or goes up one
   screen, asks before leaving a song / discarding edits, and on Home asks "Exit EvoChord?". Only active in the installed app or on Android. */
(function(){
  let on=false;try{const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1); /* v67: never on iPhone/iPad — there the edge swipe would reveal the guard page; iOS has no Back button to protect */
    on=!ios&&(matchMedia('(display-mode: standalone)').matches||/Android/i.test(navigator.userAgent))}catch(e){}
  if(!on||!history.pushState)return;
  /* v80: Chrome skips history entries that were added without a tap (an edge swipe-back then leaves the app at once). So the guard entry
     is also (re)added on the next real touch after every Back, and Exit walks back over however many guard entries exist. */
  let exiting=false,L0=history.length,needTouch=false;
  /* v82 diagnostics: a small log that survives the app closing; shown by tapping the version in About five times */
  const ua0=()=>{const u=navigator.userActivation;return u?(u.isActive?'A':u.hasBeenActive?'a':'-'):'?'};
  const blog=m=>{try{const a=JSON.parse(localStorage.getItem('evo.bklog')||'[]');a.push(new Date().toTimeString().slice(0,8)+' '+m+' len='+history.length+' ua='+ua0());localStorage.setItem('evo.bklog',JSON.stringify(a.slice(-40)))}catch(e){}};
  window.__bklog=blog;blog('load v'+APP_VER+' sa='+(matchMedia('(display-mode: standalone)').matches?1:0));
  document.addEventListener('visibilitychange',()=>blog('vis='+document.visibilityState));addEventListener('pagehide',()=>blog('pagehide'));
  const arm=()=>{try{history.pushState({evo:1},'')}catch(e){}};
  try{history.replaceState({evo:0},'');history.pushState({evo:1},'')}catch(e){return}
  blog('init push');needTouch=true;
  /* a touch only counts as a "user activation" when the finger is lifted (touchend / pointerup / click), not on touchstart */
  const touchArm=ev=>{if(exiting)return;const ua=navigator.userActivation;if(ua&&!ua.isActive)return;if(!needTouch)return;needTouch=false;arm();blog('tap-push '+(ev&&ev.type))};
  ['pointerup','touchend','click','keydown'].forEach(ev=>addEventListener(ev,touchArm,{capture:true,passive:true}));
  const isOn=id=>$(id).classList.contains('on');
  function closeTop(){
    if(tourOn()){tourEnd();return true}
    if($('#tut')&&isOn('#tut')){tutClose();return true}
    if(isOn('#ctx')){ctxClose();return true}
    if(isOn('#notebox')){closeNote();return true}
    if(isOn('#arr')){arClose();return true}
    if(isOn('#ipbox')){$('#ipX').onclick();return true}
    if(isOn('#nbox')){$('#nbox').classList.remove('on');return true}
    if(isOn('#cbox')){$('#cbox').classList.remove('on');return true}
    if(isOn('#addbox')){$('#aX').onclick();return true}
    if(isOn('#catbox')){$('#cdone').onclick();return true}
    if(isOn('#authbox')){closeAuth();return true}
    if(!$('#amenu').hidden){closeMenu();return true}
    if(isOn('#fabm')){fabOpen(false);return true}
    if(isOn('#qpop')){qpClose();return true}
    if(mn.classList.contains('on')){menuOpen(false);return true}
    if($('#qp').classList.contains('open')){qOpen(false);return true}
    if($('#spp').classList.contains('open')){spOpen(false);return true}
    if($('#vsp').classList.contains('open')){vsOpen(false);return true}
    if(dw.classList.contains('open')){drawer(false);return true}
    return false}
  function goBack(){
    if(closeTop())return;
    const v=(document.querySelector('.v.on')||{}).id;
    if(v==='play')return void leavePlay();
    if(v==='ann')return void anBack();
    if(v==='chd')return void chBack();
    if(v==='edit'){if(ed&&ed.dirty)return void ask('Discard changes?','Your edits to this song have not been saved.','Discard',()=>{ed.dirty=false;$('#eX').onclick()});return void $('#eX').onclick()}
    if(v==='friends'||v==='profile'||v==='prefs'||v==='help'||v==='acct')return void show('list');
    if(v==='doc')return void $('#dcX').onclick();
    if(v==='welcome')return void ask('Exit EvoChord?','Press Exit to close the app.','Exit',()=>{exiting=true;history.go(-Math.max(2,history.length-L0+1))});
    if(lib.v==='cat')return void $('#cBack').onclick();
    ask('Exit EvoChord?','Press Exit to close the app.','Exit',()=>{exiting=true;history.go(-Math.max(2,history.length-L0+1))})}
  addEventListener('popstate',ev=>{blog('pop st='+JSON.stringify(ev.state));if(exiting)return;arm();needTouch=true;goBack()});
})();
initAuth();
refresh();
