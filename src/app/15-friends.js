/* ---------- v34: Friends (all rules enforced server-side by supabase/003_friends.sql; the app only calls its functions) ---------- */
const fr={list:[],inbox:[],blocked:[],state:null,t:0,res:null,msg:''};
const frIn=()=>fr.list.filter(f=>f.status==='pending'&&f.incoming),frAlerts=()=>frIn().length+fr.inbox.length;
function frBadge(){const n=frAlerts(),b=$('#auth');b&&b.classList.toggle('bd',n>0&&!!user);try{if(navigator.setAppBadge){if(n>0&&user)navigator.setAppBadge(n).catch(()=>{});else navigator.clearAppBadge().catch(()=>{})}}catch(e){}if(!$('#amenu').hidden&&user)buildMenu(user)}
const frMissing=e=>e&&(e.code==='PGRST202'||e.code==='42883'||e.code==='42P01'||/could not find|does not exist/i.test(e.message||''));
const frSig=()=>JSON.stringify([fr.list.map(f=>f.id+f.status),fr.inbox.map(m=>m.id)]);
async function frLoad(force,render){if(!user||!sb)return;if(!force&&Date.now()-fr.t<30000)return;
  const before=frSig();
  try{const{data,error}=await sb.rpc('list_friends');
    if(error){if(frMissing(error))fr.state='nosql';else if(!fr.state)fr.state='err';frRender();return}
    fr.list=Array.isArray(data)?data:[];fr.state='ok';fr.t=Date.now();
    const ib=await sb.rpc('list_inbox');if(!ib.error)fr.inbox=Array.isArray(ib.data)?ib.data:[];
    const bk=await sb.rpc('list_blocked');fr.blocked=!bk.error&&Array.isArray(bk.data)?bk.data:[];await susCheck()}catch(e){if(!fr.state)fr.state='err'}
  frBadge();if(render||frSig()!==before)frRender();frNotify()}
/* v38: in-app notifications. New friend requests / songs from friends show a banner (and the red dot + app badge).
   Never while a song is playing (live safety): it waits until you are back on Home. Polled every 25 s while the app is open and visible. */
/* v159: suspension (set by the admin with admin_suspend in the SQL Editor). social = no sending / requests; full = the app is locked */
const susp={on:false,mode:null,until:null,reason:null};
const susText=()=>(susp.until?L('Until ','Sampai ')+new Date(susp.until).toLocaleDateString(PREF.lang==='id'?'id-ID':'en-GB',{day:'numeric',month:'long',year:'numeric'})+'.':L('Until further notice.','Sampai pemberitahuan berikutnya.'))+(susp.reason?' '+L('Reason: ','Alasan: ')+susp.reason:'');
async function susCheck(){if(!user||!sb)return;try{const{data,error}=await sb.rpc('my_status');if(error)return;const d=Array.isArray(data)?data[0]:data;
  susp.on=!!(d&&d.suspended);susp.mode=susp.on?d.mode:null;susp.until=susp.on?d.until:null;susp.reason=susp.on?d.reason:null}catch(e){return}susLock()}
function susLock(){let o=$('#susp');const lock=susp.on&&susp.mode==='full'&&!!user;if(!lock){if(o)o.remove();return}
  if(!o){o=E('div');o.id='susp';o.setAttribute('role','alertdialog');o.setAttribute('aria-modal','true');document.body.append(o)}o.textContent='';
  const c=E('div','spc2');c.append(E('h2','',L('Your account is suspended','Akunmu sedang dibekukan')),E('p','',L('This account cannot use Evo Chord right now.','Akun ini tidak bisa memakai Evo Chord untuk saat ini.')),(()=>{const q=E('p','mut',susText());q.setAttribute('data-nt','');return q})());
  const a=E('a','dbtn pri',L('Contact support','Hubungi dukungan'));a.href=supportMail('Evo Chord: suspended account');a.target='_blank';a.rel='noopener';
  const so=E('button','dbtn',L('Sign out','Keluar'));so.type='button';so.onclick=()=>{o.remove();signOut()};c.append(a,so);o.append(c)}
const SEENK='evolyric-seen:';
function seenLoad(){try{return new Set(JSON.parse(localStorage.getItem(SEENK+(user&&user.id))||'[]'))}catch(e){return new Set()}}
function seenSave(set){try{localStorage.setItem(SEENK+user.id,JSON.stringify([...set].slice(-200)))}catch(e){}}
function frNotify(){if(!user||fr.state!=='ok')return;
  const items=[...frIn().map(f=>({k:'r:'+f.id,t:'r',u:f.username})),...fr.inbox.map(m=>({k:'s:'+m.id,t:'s',u:m.username,n:m.song_count||1}))];
  const seen=seenLoad(),fresh=items.filter(x=>!seen.has(x.k));
  if(!fresh.length){seenSave(new Set(items.map(x=>x.k)));return}
  if($('#friends').classList.contains('on')){seenSave(new Set(items.map(x=>x.k)));return}
  if($('#play').classList.contains('on'))return; /* wait until the performance view is closed */
  seenSave(new Set(items.map(x=>x.k)));
  const rq=fresh.filter(x=>x.t==='r'),sg=fresh.filter(x=>x.t==='s');let m;
  if(fresh.length===1){const x=fresh[0];m=x.t==='r'?'@'+x.u+' sent you a friend request':x.n>1?'@'+x.u+' sent you '+x.n+' songs':'@'+x.u+' sent you a song'}
  else m=[rq.length&&rq.length+(rq.length===1?' friend request':' friend requests'),sg.length&&sg.length+(sg.length===1?' song delivery':' song deliveries')].filter(Boolean).join(' · ');
  ntfShow(m)}
let ntfT;function ntfShow(m){const n=$('#ntf');n.textContent=m;n.hidden=false;requestAnimationFrame(()=>n.classList.add('on'));clearTimeout(ntfT);ntfT=setTimeout(ntfHide,7000)}
function ntfHide(){const n=$('#ntf');n.classList.remove('on');setTimeout(()=>{if(!n.classList.contains('on'))n.hidden=true},260)}
$('#ntf').onclick=()=>{ntfHide();if(document.querySelector('#play.on'))return;frOpen()};
setInterval(()=>{if(!document.hidden&&user&&sb&&navigator.onLine)frLoad(true)},25000);
/* v159: messages for the safety rules in supabase/011_safety.sql */
const safeErr=e=>!e?null:e.code==='EV001'?L('Your account is suspended. Sending and friend requests are off.','Akunmu sedang dibekukan. Kirim lagu dan permintaan pertemanan tidak bisa dipakai.'):e.code==='EV002'?L('You cannot do this with this person.','Kamu tidak bisa melakukan ini dengan orang ini.'):e.code==='EV003'?L('Daily limit reached. Try again tomorrow.','Batas harian tercapai. Coba lagi besok.'):null;
async function frCall(fn,args,okMsg){try{const{data,error}=await sb.rpc(fn,args);if(error){note(safeErr(error)||(navigator.onLine?'Something went wrong. Try again.':'You are offline'),true);return null}
  if(okMsg)note(okMsg);await frLoad(true,true);return data==null?'':data}catch(e){note('Something went wrong. Try again.',true);return null}}
function frAvatar(f){return avatarEl({name:f.display_name||f.username||'?',avatar:f.avatar_url||''})}
function frRow(f,btns){const r=E('div','fr'),n=E('div','fn');n.append(f.ui?E('b','',f.display_name):UE('b','',f.display_name||f.username),UE('small','','@'+f.username));if(f.bio)n.append(UE('small','fb',f.bio));r.append(frAvatar(f),n);
  btns.forEach(([t,fn,pri])=>{const b=E('button',pri?'pri':'',t);b.type='button';b.onclick=()=>{b.disabled=true;fn()};r.append(b)});return r}
async function frFind(){const box=$('#frres');const q=$('#frq').value.trim().toLowerCase().replace(/^@/,'');box.textContent='';fr.res=null;
  const er=unameErr(q);if(er){box.append(E('p','err',er));return}
  const b=$('#frgo');b.disabled=true;
  try{const{data,error}=await sb.rpc('find_user',{p_username:q});b.disabled=false;
    if(error){box.append(E('p','err',frMissing(error)?'Friends are not enabled on the server yet.':navigator.onLine?'Search failed. Try again.':'You are offline'));return}
    const u=data&&data[0];if(!u){box.append(E('p','mut','No one found with that username. Check the spelling.'));return}
    const ex=fr.list.find(f=>f.other_id===u.id),card=E('div','fcard');
    const act=!ex?[['Add friend',async()=>{const r=await frCall('send_friend_request',{p_user:u.id},null);if(r!==null){note(r==='friends'?'You are now friends':'Request sent');frFind()}},1]]:null;
    const row=frRow({display_name:u.display_name,username:u.username,avatar_url:u.avatar_url,bio:u.bio},act||[]);
    if(ex){const t=E('small','mut',ex.status==='accepted'?'Already friends':ex.incoming?'Sent you a request (see Requests below)':'Request sent');t.style.flex='none';row.append(t)}
    card.append(row);box.append(card)}catch(e){b.disabled=false;box.append(E('p','err','Search failed. Try again.'))}}
function frRender(){const body=$('#frbody');if(!$('#friends').classList.contains('on'))return;
  const keep=$('#frq')?$('#frq').value:'',had=document.activeElement&&document.activeElement.id==='frq';body.textContent='';
  if(!user){body.append(E('p','mut','Sign in to use Friends.'));return}
  if(fr.state==='nosql'){const c=E('div','fcard');c.append(E('p','','Friends are not enabled on the server yet. Run supabase/003_friends.sql in the Supabase SQL Editor, then reopen the app.'));body.append(c);return}
  if(!uname.v&&uname.state!=='nosql'){const c=E('div','fcard');c.append(E('p','','Choose a username in your profile first. Friends find you by it.'));const b=E('button','pill','Open profile');b.type='button';b.onclick=profOpen;c.append(b);body.append(c)}
  const s=E('div','frs'),i=E('input');i.id='frq';i.placeholder='Find by exact username';i.value=keep;i.autocapitalize='none';i.setAttribute('autocorrect','off');i.spellcheck=false;i.setAttribute('aria-label','Find a friend by username');i.onkeydown=e=>{if(e.key==='Enter')frFind()};
  const g=E('button','pill','Find');g.id='frgo';g.type='button';g.onclick=frFind;s.append(i,g);body.append(s);const res=E('div');res.id='frres';body.append(res);if(had)i.focus();
  if(fr.state==='err'){body.append(E('p','mut','Could not load your friends. Pull down or reopen this screen to retry.'))}
  const inc=frIn(),out=fr.list.filter(f=>f.status==='pending'&&!f.incoming),ok=fr.list.filter(f=>f.status==='accepted').sort((a,b)=>(a.display_name||a.username).localeCompare(b.display_name||b.username,'id'));
  const sec=(t,n)=>{const h=E('div','fh',t);if(n)h.append(E('em','',String(n)));body.append(h)};
  if(fr.inbox.length){sec('Songs from friends',fr.inbox.length);fr.inbox.forEach(m=>{const n=m.song_count||1;
    const isC=!!m.cat,r=frRow({ui:!isC&&(n>1||!m.title),display_name:isC?m.cat:n>1?n+' songs':(m.title||'Untitled'),username:m.username,avatar_url:m.avatar_url},[[isC?'Open':'Save'+(n>1?' all':''),isC?()=>catImport(m):()=>frSaveSong(m),1],['Dismiss',()=>frCall('clear_inbox_song',{p_id:m.id},'Dismissed')]]);
    {const mo=E('button','frm','⋯');mo.type='button';mo.setAttribute('aria-label',L('More','Lainnya'));mo.onclick=()=>frMore({id:m.sender_id,username:m.username},m.id);r.append(mo)}
    const sm=r.querySelector('small');sm.textContent=L('from @','dari @')+m.username+(isC?' · category · '+n+(n===1?' song':' songs'):n>1?(m.preview?' · '+m.preview+(n>3?'…':''):''):(m.artist?' · '+m.artist:''));body.append(r)})}
  if(inc.length){sec('Requests',inc.length);inc.forEach(f=>{const r=frRow(f,[['Accept',()=>frCall('respond_friend_request',{p_id:f.id,p_accept:true},'Friend added'),1],['Decline',()=>frCall('respond_friend_request',{p_id:f.id,p_accept:false},'Request declined')]]);
    const mo=E('button','frm','⋯');mo.type='button';mo.setAttribute('aria-label',L('More','Lainnya'));mo.onclick=()=>frMore({id:f.other_id,username:f.username});r.append(mo);body.append(r)})}
  if(out.length){sec('Sent');out.forEach(f=>body.append(frRow(f,[['Cancel',()=>frCall('remove_friendship',{p_id:f.id},'Request cancelled')]])))}
  sec('Friends',ok.length);
  if(!ok.length)body.append(E('p','mut','No friends yet. Search a username above to send a request.'));
  ok.forEach(f=>{const r=frRow(f,[]);r.classList.add('tap');r.setAttribute('role','button');r.tabIndex=0;r.append(E('span','chev','›'));r.onclick=()=>frFriendMenu(f);r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();frFriendMenu(f)}};body.append(r)});
  if(fr.blocked.length){sec(L('Blocked','Diblokir'),fr.blocked.length);fr.blocked.forEach(u=>{const r=frRow({display_name:u.display_name||u.username||'—',username:u.username||'—',avatar_url:u.avatar_url},[[L('Unblock','Buka blokir'),()=>frCall('unblock_user',{p_user:u.id},L('Unblocked','Blokir dibuka'))]]);body.append(r)})}
  if(susp.on){const w=E('div','susb');{const st=E('span','',susText());st.setAttribute('data-nt','');w.append(E('b','',L('Your account is suspended','Akunmu sedang dibekukan')),st)}const a=E('a','',L('Contact support','Hubungi dukungan'));a.href=supportMail('Evo Chord: suspended account');a.target='_blank';a.rel='noopener';w.append(a);body.prepend(w)}}
async function frSaveSong(m){let d=null;
  try{const{data,error}=await sb.rpc('get_inbox_item',{p_id:m.id});if(error||!data)throw 0;d=data}catch(e){note(navigator.onLine?'Could not open this delivery. Try again.':'You are offline',true);frRender();return}
  const arr=Array.isArray(d.songs)?d.songs:[d],t=Date.now();let n=0;
  arr.forEach((x,i)=>{if(!x||typeof x!=='object')return;const ns={id:'s'+(t+i)+Math.random().toString(36).slice(2,5),title:String(x.title||'Untitled'),artist:String(x.artist||''),lyrics:String(x.lyrics||''),speed:5,font:defFont(),cr:t+i,md:t+i};
    if(x.key)ns.key=String(x.key);if(x.colors&&typeof x.colors==='object')ns.colors=x.colors;songs.push(ns);n++});
  if(!n){frRender();return}
  save();refresh();
  frCall('clear_inbox_song',{p_id:m.id},n===1?'Saved to your library':n+' songs saved to your library')}
/* v113: open a received category: every song shows whether it is new or already in your library; you choose per song (Save a copy / Use mine / Skip). Nothing is ever overwritten. */
const normT=t=>String(t||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
async function catImport(m){let d=null;
  try{const{data,error}=await sb.rpc('get_inbox_item',{p_id:m.id});if(error||!data)throw 0;d=data}catch(e){note(navigator.onLine?'Could not open this delivery. Try again.':'You are offline',true);return}
  const arr=(Array.isArray(d.songs)?d.songs:[]).filter(x=>x&&typeof x==='object');if(!arr.length)return;
  const idx={};songs.forEach(x=>{const k=normT(x.title)+'|'+normT(x.artist);if(!idx[k])idx[k]=x});
  const rows=arr.map(x=>{const mine=idx[normT(x.title)+'|'+normT(x.artist)]||null;return{x,mine,ch:mine?'use':'save'}});
  const box=$('#imItems'),nm=$('#imName');nm.value=cname(d.cat||m.cat||'Category').slice(0,30);$('#imErr').textContent='';$('#imT').textContent='Received category';
  const lab={save:'Save a copy',use:'Use mine',skip:'Skip'};
  nm.oninput=()=>{$('#imErr').textContent=''};const upd=()=>{const n=rows.filter(r=>r.ch!=='skip').length;$('#imC').textContent=n+' of '+rows.length+' songs will be added';$('#imOK').disabled=!n;$('#imOK').textContent='Save'};
  const draw=()=>{box.textContent='';rows.forEach(r=>{const row=E('div','imr'),t=E('div'),b=E('button','cyc s'+(r.ch==='skip'?2:r.ch==='use'?1:0),lab[r.ch]);b.type='button';
      t.append(UE('b','',r.x.title,'Untitled'),UE('small','',r.x.artist));if(r.mine)t.append(E('small','tag','You already have this song'));else t.append(E('small','tag','New'));
      b.onclick=()=>{const o=r.mine?['use','save','skip']:['save','skip'];r.ch=o[(o.indexOf(r.ch)+1)%o.length];draw();upd()};row.append(t,b);box.append(row)})};
  draw();upd();$('#imbox').classList.add('on');
  $('#imX').onclick=()=>$('#imbox').classList.remove('on');$('#imbox').onclick=e=>{if(e.target.id==='imbox')$('#imX').onclick()};
  $('#imOK').onclick=()=>{const n=cname(nm.value),e=nameErr(n,null);if(e){$('#imErr').textContent=e;return}
    const t=Date.now(),ids=[];let made=0;
    rows.forEach((r,i)=>{if(r.ch==='skip')return;if(r.ch==='use'&&r.mine){ids.push(r.mine.id);return}
      const ns={id:'s'+(t+i)+Math.random().toString(36).slice(2,5),title:String(r.x.title||'Untitled'),artist:String(r.x.artist||''),lyrics:String(r.x.lyrics||''),speed:5,font:defFont(),cr:t+i,md:t+i};
      if(r.x.key)ns.key=String(r.x.key);if(r.x.colors&&typeof r.x.colors==='object')ns.colors=r.x.colors;songs.push(ns);ids.push(ns.id);made++});
    if(!ids.length)return;cats.push({id:cid(),name:n,ids:[...new Set(ids)]});save();refresh();$('#imbox').classList.remove('on');
    frCall('clear_inbox_song',{p_id:m.id},'Category “'+n+'” saved')}}
const SEND_MAX=300,songPayload=s=>({title:s.title||'',artist:s.artist||'',lyrics:s.lyrics||'',key:s.key||'',colors:s.colors||{}});
const sendErr=(e,f)=>safeErr(e)||(e.code==='54000'?'@'+f.username+' already has 20 deliveries waiting from you':e.code==='42501'?'You are no longer friends':e.code==='23514'?'Too much text to send at once. Send fewer songs.':navigator.onLine?'Could not send. Try again.':'You are offline');
function sendOpen(f){if(!songs.length)return void note('Your library is empty',true);aMode='send';aTo=f;aSel=new Set();$('#aT').textContent='Send to @'+f.username;$('#aq').value='';addItems();aCount();$('#addbox').classList.add('on')}
async function sendBatch(){const f=aTo;if(!f||!aSel.size||!sb)return;const b=$('#aOK');if(b.disabled)return;b.disabled=true;
  const pick=songs.filter(x=>aSel.has(x.id)).sort((x,y)=>(x.title||'').localeCompare(y.title||'','id')).map(songPayload);
  try{const{error}=await sb.rpc('send_songs',{p_to:f.other_id,p_songs:pick});
    if(error){aCount();return void note(sendErr(error,f),true)}
    aSel=new Set();$('#addbox').classList.remove('on');note(pick.length===1?'Sent to @'+f.username:'Sent '+pick.length+' songs to @'+f.username)}
  catch(e){aCount();note('Could not send. Try again.',true)}}
function frFriendMenu(f){const c=csh();c.append(E('h3','',(f.display_name||f.username)+'  @'+f.username));
  const a=E('button','','Send songs');a.onclick=()=>{ctxClose();sendOpen(f)};
  const d=E('button','del','Unfriend');d.onclick=()=>ask('Unfriend '+(f.display_name||f.username)+'?','They will no longer be your friend. Songs already saved stay in each library, and songs still waiting are deleted.','Unfriend',()=>frCall('remove_friendship',{p_id:f.id},'Friend removed'));
  const rp=E('button','',L('Report','Laporkan'));rp.onclick=()=>reportOpen({id:f.other_id,username:f.username});
  const bl=E('button','del',L('Block','Blokir'));bl.onclick=()=>blockAsk({id:f.other_id,username:f.username});
  const x=E('button','','Cancel');x.onclick=ctxClose;c.append(a,d,rp,bl,x);$('#ctx').classList.add('on')}
/* v159: Block – ends the friendship, deletes waiting songs both ways, and stops new requests and songs from this person */
function blockAsk(u){ask(L('Block @','Blokir @')+u.username+'?',L('You will no longer be friends. Songs waiting in both directions are deleted, and this person cannot find you, send you a request or send you songs. They are not told. You can unblock in Friends → Blocked.','Pertemanan berakhir. Lagu kiriman yang masih menunggu di kedua arah dihapus, dan orang ini tidak bisa menemukanmu, mengirim permintaan, atau mengirim lagu. Dia tidak diberi tahu. Kamu bisa membuka blokir di Teman → Diblokir.'),L('Block','Blokir'),()=>frCall('block_user',{p_user:u.id},L('Blocked','Diblokir')))}
/* v159: Report – goes to Evolution Digital Studio for review; you can also block at the same time */
function reportOpen(u,delivery){const c=csh();c.append(E('h3','',L('Report @','Laporkan @')+u.username));
  const R=[['spam',L('Spam','Spam')],['inappropriate',L('Inappropriate content','Konten tidak pantas')],['harassment',L('Harassment','Pelecehan')],['other',L('Something else','Lainnya')]];let pick=null;
  const go=E('button','fgo',L('Send report','Kirim laporan'));go.type='button';go.disabled=true;
  R.forEach(([v,t])=>{const b=E('button','ck rr',t);b.type='button';b.setAttribute('role','radio');b.setAttribute('aria-checked','false');b.append(E('i','','○'));b.onclick=()=>{pick=v;c.querySelectorAll('.rr').forEach(x=>{const on=x===b;x.setAttribute('aria-checked',on?'true':'false');x.querySelector('i').textContent=on?'●':'○'});go.disabled=false};c.append(b)});
  const t=E('textarea','rpt');t.maxLength=500;t.rows=3;t.placeholder=L('What happened? (optional)','Apa yang terjadi? (opsional)');c.append(t);
  const bl=E('button','ck rpb',L('Also block @','Sekalian blokir @')+u.username);bl.type='button';bl.setAttribute('role','checkbox');bl.setAttribute('aria-checked','false');bl.append(E('i','','☐'));bl.onclick=()=>{const on=bl.getAttribute('aria-checked')!=='true';bl.setAttribute('aria-checked',on?'true':'false');bl.querySelector('i').textContent=on?'☑':'☐'};c.append(bl);
  go.onclick=async()=>{if(!pick)return;go.disabled=true;const r=await frCall('report_user',{p_user:u.id,p_reason:pick,p_details:t.value.trim()||null,p_delivery:delivery||null},null);if(r===null){go.disabled=false;return}
    ctxClose();if(bl.getAttribute('aria-checked')==='true')await frCall('block_user',{p_user:u.id},null);note(L('Thank you. Your report was sent.','Terima kasih. Laporanmu sudah dikirim.'))};
  const x=E('button','',L('Cancel','Batal'));x.onclick=ctxClose;c.append(go,x);$('#ctx').classList.add('on')}
/* ⋯ on a request or a delivery: Report / Block */
function frMore(u,delivery){const c=csh();c.append(E('h3','','@'+u.username));const rp=E('button','',L('Report','Laporkan'));rp.onclick=()=>reportOpen(u,delivery);
  const bl=E('button','del',L('Block','Blokir'));bl.onclick=()=>blockAsk(u);const x=E('button','',L('Cancel','Batal'));x.onclick=ctxClose;c.append(rp,bl,x);$('#ctx').classList.add('on')}
const catPayload=c=>c.ids.map(id=>songs.find(x=>x.id===id)).filter(Boolean).map(songPayload);
function sendCat(c){const pl=catPayload(c);if(!pl.length)return void note('This category has no songs yet',true);if(pl.length>SEND_MAX)return void note('A category can send up to '+SEND_MAX+' songs',true);sendPick(null,c)}
function sendPick(s,cat){if(!user||!sb)return void note('Sign in to send songs to friends',true);const pl=cat?catPayload(cat):[songPayload(s)];
  const go=()=>{const c=csh();c.append(E('h3','',cat?'Send category “'+cat.name+'” to…':'Send “'+(s.title||'Untitled')+'” to…'));
    const ok=fr.list.filter(f=>f.status==='accepted').sort((a,b)=>(a.display_name||a.username).localeCompare(b.display_name||b.username,'id'));
    if(fr.state==='nosql'){const p=E('p','mut','Friends are not enabled on the server yet.');p.style.cssText='margin:0 10px 10px;max-width:280px;font-size:14px';c.append(p)}
    else if(!ok.length){const p=E('p','mut','You have no friends yet. Add one first, then send songs.');p.style.cssText='margin:0 10px 10px;max-width:280px;font-size:14px';c.append(p);const b=E('button','','Open Friends');b.onclick=()=>{ctxClose();if(document.querySelector('#play.on'))leavePlay();frOpen()};c.append(b)}
    else{const lst=E('div','fplist'),sel=new Set(),go2=E('button','fgo');go2.type='button';
      const upd=()=>{go2.disabled=!sel.size;go2.textContent=sel.size?'Send to '+sel.size+(sel.size>1?' friends':' friend'):'Select friends'};upd();
      ok.forEach(f=>{const b=E('button','fpick');b.type='button';b.append(frAvatar(f),E('span','',f.username?'@'+f.username:(f.display_name||'Friend')),E('i','fck'));
        b.onclick=()=>{sel.has(f.other_id)?sel.delete(f.other_id):sel.add(f.other_id);b.classList.toggle('on',sel.has(f.other_id));upd()};lst.append(b)});
      go2.onclick=async()=>{const to=ok.filter(f=>sel.has(f.other_id));if(!to.length)return;ctxClose();let n=0,full=[],gone=0,bad=0;
        for(const f of to){try{const{error}=await sb.rpc('send_songs',cat?{p_to:f.other_id,p_songs:pl,p_cat:cat.name}:{p_to:f.other_id,p_songs:pl});
          if(!error)n++;else if(error.code==='54000')full.push('@'+f.username);else if(error.code==='42501')gone++;else bad++}catch(e){bad++}}
        if(!n&&bad&&!navigator.onLine)return void note('You are offline',true);
        const w=[];if(full.length)w.push(full.join(', ')+' already has 20 songs waiting');if(gone)w.push(gone+' no longer a friend');if(bad)w.push(bad+' failed');
        note(n?('Sent to '+n+(n>1?' friends':' friend'))+(w.length?' · '+w.join(' · '):''):w.join(' · ')||'Could not send. Try again.',!n)};
      c.append(lst,go2)}
    const x=E('button','','Cancel');x.onclick=ctxClose;c.append(x);$('#ctx').classList.add('on')};
  if(fr.state==null||Date.now()-fr.t>60000)frLoad(true).then(go);else go()}
function frOpen(){closeMenu();ntfHide();show('friends');frRender();frLoad(true,true)}
$('#frX').onclick=()=>{show('list')};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user&&sb)frLoad()});

