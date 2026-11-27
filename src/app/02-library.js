/* ---------- Daftar ---------- */
/* v32: pinned songs + sort. cr/md are plain song fields (synced through app_data); older songs fall back to the time inside their id. */
const PIN_SVG='<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M7 2.5h6l-.8 5 2.6 3H5.2l2.6-3L7 2.5zM10 10.5V17.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const SORTS=[['az','A–Z'],['new','Newest added'],['old','Oldest added'],['mod','Recently modified']];
const SORTK='evolyric-sort-v1';let sortBy='az';try{const v=localStorage.getItem(SORTK);if(SORTS.some(x=>x[0]===v))sortBy=v}catch(e){}
const idTime=s=>{const m=/^s(\d{12,})/.exec(s.id||'');return m?+m[1]:0};
const crOf=s=>s.cr||idTime(s),mdOf=s=>s.md||crOf(s);
const byTitle=(a,b)=>(a.title||'').localeCompare(b.title||'','id');
/* v143: typo-tolerant search. fzK = how many letters may be wrong for a word of that length (short words must be exact);
   fzD = edit distance (insert, delete, replace, swap of two neighbours) that stops early once it is over the limit;
   fzOk = a typed word matches a word of the song – whole word, or the start of it while still typing. */
const fzN=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const fzK=n=>n<=3?0:n<=6?1:2;
function fzD(a,b,k){if(Math.abs(a.length-b.length)>k)return k+1;let pp=null,p=Array.from({length:b.length+1},(_,j)=>j);
  for(let i=1;i<=a.length;i++){const c=[i];let lo=i;for(let j=1;j<=b.length;j++){let v=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));
      if(pp&&i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])v=Math.min(v,pp[j-2]+1);c[j]=v;if(v<lo)lo=v}
    if(lo>k)return k+1;pp=p;p=c}return p[b.length]}
function fzOk(t,w){const k=fzK(t.length);if(!k)return false;if(fzD(t,w,k)<=k)return true;
  return w.length>t.length&&t.length>=5&&fzD(t,w.slice(0,t.length),1)<=1}
const fzWs=x=>fzN(x).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
function sorter(){return sortBy==='new'?(a,b)=>crOf(b)-crOf(a)||byTitle(a,b):sortBy==='old'?(a,b)=>crOf(a)-crOf(b)||byTitle(a,b):sortBy==='mod'?(a,b)=>mdOf(b)-mdOf(a)||byTitle(a,b):byTitle}
function items(box,q,pick,menu,pool,cat,empty,keep){
  box.textContent='';q=(q||'').toLowerCase();const T=q.split(/\s+/).filter(Boolean);let L='';
  const fz=new Set(),cmp=sorter(),hit=(pool||songs).filter(s=>{const h=((s.title||'')+' '+(s.artist||'')).toLowerCase();if(T.every(w=>h.includes(w)))return true;
    const W=fzWs(h),hn=fzN(h);if(T.every(w=>{const n=fzN(w);return hn.includes(n)||W.some(x=>fzOk(n,x))})){fz.add(s);return true}return false}); /* v143: near misses (typos) are found too */
  /* v129: while searching, the best match comes first. Only the START of a word counts: title 1st word, title 2nd word, title later words, then artist 1st word, 2nd word, later words; matches in the middle of a word come last. The chosen sort only orders songs of the same rank. */
  const ws=x=>x.split(/[^\p{L}\p{N}]+/u).filter(Boolean),
    rank=s=>{if(!T.length)return 0;const ti=(s.title||'').toLowerCase(),ar=(s.artist||'').toLowerCase(),w=T[0];
      if(fz.has(s))return 7; /* typo matches come after every exact match */
      if(ti.startsWith(q))return 0;
      const a=ws(ti).findIndex(x=>x.startsWith(w));if(a>=0)return Math.min(a,2);
      const b=ws(ar).findIndex(x=>x.startsWith(w));if(b>=0)return 3+Math.min(b,2);
      return 6},
    cmpR=T.length&&!keep?(a,b)=>rank(a)-rank(b)||cmp(a,b):cmp;
  const pins=keep?[]:hit.filter(s=>s.pin).sort(cmpR),rest=keep?hit:hit.filter(s=>!s.pin).sort(cmpR); /* keep = keep the given order (Recent) */
  const row=s=>{
      const b=E('button','it'),t=E('b'),n=UE('span','',s.title,'Untitled');
      if(s.pin){const pi=E('span','pinic');pi.innerHTML=PIN_SVG;n.prepend(pi)}
      t.append(n);
      if(s.key)t.append(E('span','key',s.key));
      b.append(t,UE('small','',s.artist));
      if(menu)press(b,()=>pick(s),()=>ctxOpen(s,cat));else b.onclick=()=>pick(s,b);
      box.append(b)};
  if(pins.length){const h=E('div','ltr pn');h.innerHTML=PIN_SVG;h.append(E('span','','Pinned'));box.append(h);pins.forEach(row);
    if(rest.length)box.append(E('div','ltr','All songs'))}
  rest.forEach(s=>{
      if(sortBy==='az'&&!keep){const l=((s.title||'')[0]||'#').toUpperCase();if(l!==L){L=l;box.append(E('div','ltr',l))}}
      row(s)});
  if(!box.children.length)box.append(E('p','mut',empty||'No songs.'));
}
/* v112: categories can be sorted too (A–Z / newest / oldest; the time comes from the category id) and pinned to the top */
const CSORTS=[['az','A–Z'],['new','Newest added'],['old','Oldest added']],CSORTK='evolyric-catsort-v1';let catSortBy='az';try{const v=localStorage.getItem(CSORTK);if(CSORTS.some(x=>x[0]===v))catSortBy=v}catch(e){}
const cTime=c=>{const m=/^c([0-9a-z]{6,9})[0-9a-z]{3}$/.exec(c.id||'');return m?parseInt(m[1],36)||0:0};
const catSorter=()=>catSortBy==='new'?(a,b)=>cTime(b)-cTime(a)||byName(a,b):catSortBy==='old'?(a,b)=>cTime(a)-cTime(b)||byName(a,b):byName;
function catList(){
  const box=$('#items');box.textContent='';const q=($('#q').value||'').trim().toLowerCase();
  const cmp=catSorter(),F=cats.filter(c=>c.name.toLowerCase().includes(q)),L=[...F.filter(c=>c.pin).sort(cmp),...F.filter(c=>!c.pin).sort(cmp)]; /* pinned categories first */
  L.forEach(c=>{const b=E('button','it'),t=E('b'),n=c.ids.length,nm=UE('span','',c.name);if(c.pin){const pi=E('span','pinic');pi.innerHTML=PIN_SVG;nm.prepend(pi)}t.append(nm,E('span','key',n+(n===1?' song':' songs')));b.append(t);
    press(b,()=>{lib.v='cat';lib.id=c.id;$('#q').value='';refresh();listIn()},()=>ctxCat(c));box.append(b)});
  if(!L.length)box.append(E('p','mut',cats.length?'No matching categories.':'No categories yet. Create one to organize your songs.'))}
function refresh(){
  if(lib.v==='cat'&&!curCat())lib.v='cats';
  const cat=lib.v==='cat'?curCat():null;
  const tabOn=lib.v==='cat'?'cats':lib.v;$('#tabs').querySelectorAll('button[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===tabOn));
  $('#crumb').hidden=!cat;$('#cName').textContent=cat?cat.name:'';
  $('#sortb').hidden=lib.v==='recent';$('#hView').hidden=lib.v==='cats';
  $('#q').placeholder=lib.v==='all'?'Search songs…':lib.v==='recent'?'Search recent songs…':cat?'Search in '+cat.name+'…':'Search categories…';
  $('#actrow').hidden=lib.v==='all'||lib.v==='recent';$('#act').textContent=cat?'Add Songs to '+cat.name:'+ New Category';
  if(lib.v==='cats')catList();
  else if(lib.v==='recent')items($('#items'),$('#q').value,s=>openSong(s),true,recSongs(),null,'Songs you open will show up here (the last 15 are kept).',true);
  else items($('#items'),$('#q').value,s=>openSong(s),true,cat?poolFor(cat.id):songs,cat,cat&&!$('#q').value.trim()?'No songs in this category yet. Tap “Add Songs to '+cat.name+'”.':'No songs.');
  emptyWeb()}
/* v152: nothing in the Library for what was typed -> one tap to look for it on the internet (same as the globe button) */
function webCard(box,q,go){const b=E('button','ewb');b.type='button';b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5a14 14 0 0 1 0 19 14 14 0 0 1 0-19Z"/><path d="M2.5 12h19"/></svg>';
  const t=E('span');t.append(E('b','',L('Search the internet','Cari di internet')));const qq=E('small','',q);qq.setAttribute('data-nt','');t.append(qq);b.append(t);b.onclick=()=>go(b);box.append(b);return b}
/* v154: the globe buttons are gone – this card is the way to search online from the search box.
   v176: shown under EVERY song search (All Songs, Recent, inside a category), also when songs match:
   a song with the same title may be a different one you don't have yet. Not in the Categories tab. */
function emptyWeb(){const q=$('#q').value.trim(),box=$('#items');if(lib.v==='cats'||!q)return;webCard(box,q,b=>wlGo(q,b)).classList.toggle('after',!!box.querySelector('.it'))}
/* v154/v176: same card in the side panel, under every search */
function dEmptyWeb(){const q=$('#dq').value.trim(),box=$('#dItems');if(!q)return;webCard(box,q,b=>{drawer(false);wlGo(q,b)}).classList.toggle('after',!!box.querySelector('.it'))}
/* v152: the list slides in when you switch tab or open a category */
function listIn(){const b=$('#items');b.classList.remove('lin');void b.offsetWidth;b.classList.add('lin');clearTimeout(listIn.t);listIn.t=setTimeout(()=>b.classList.remove('lin'),900)}
$('#tabs').onclick=e=>{const b=e.target.closest('button[data-v]');if(!b)return;lib.v=b.dataset.v;lib.id=null;$('#q').value='';refresh();listIn()};
$('#cBack').onclick=()=>{lib.v='cats';lib.id=null;$('#q').value='';refresh()};
const csh=()=>{const c=$('#csheet');c.textContent='';c.classList.remove('wl');return c};
function ctxOpen(s,cat){
  const c=csh();c.append(UE('h3','',s.title,'Untitled'));
  const add=(t,f,cl)=>{const b=E('button',cl||'',t);b.onclick=f;c.append(b);return b};
  if(user)add('Send to friend',()=>{ctxClose();sendPick(s)});
  add(s.pin?'Unpin':'Pin to top',()=>{if(s.pin)delete s.pin;else s.pin=Date.now();save();ctxClose();refresh();note(s.pin?'Pinned to top':'Unpinned')});
  add('Make New Version',()=>{ctxClose();openEdit(null,s.lyrics,(s.title||'')+'_new',s)});
  {const g=add('Search online',()=>{ctxClose();wlGo(s.title||'',null)},'wsr');g.insertAdjacentHTML('afterbegin','<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5a14 14 0 0 1 0 19 14 14 0 0 1 0-19Z"/><path d="M2.5 12h19"/></svg>')} /* v154: the globe lives here now – same title, other singers or versions */
  if(cat)add('Remove from '+cat.name,()=>{cat.ids=cat.ids.filter(x=>x!==s.id);save();ctxClose();refresh();note('Removed from '+cat.name)});
  else add('Delete Song',()=>ask('Delete “'+(s.title||'Untitled')+'”?','This deletes the song from your Master Library and from all of its categories. This cannot be undone.','Delete Song',()=>{delSong(s);refresh();note('Song deleted')}),'del');
  $('#ctx').classList.add('on')}
function ctxCat(c){
  const k=csh();k.append(UE('h3','',c.name));
  const add=(t,f,cl)=>{const b=E('button',cl||'',t);b.onclick=f;k.append(b)};
  if(user&&sb)add('Send category',()=>{ctxClose();sendCat(c)});
  add(c.pin?'Unpin':'Pin to top',()=>{if(c.pin)delete c.pin;else c.pin=Date.now();save();ctxClose();refresh()});
  add('Rename',()=>{ctxClose();nameBox('Rename category',c.name,c.id,n=>{c.name=n;save();refresh()})});
  add('Delete category',()=>ask('Delete “'+c.name+'”?','Only the category is deleted. The songs stay in All Songs and in their other categories.','Delete category',()=>{cats=cats.filter(x=>x!==c);save();if(lib.id===c.id){lib.v='cats';lib.id=null}refresh();note('Category deleted')}),'del');
  $('#ctx').classList.add('on')}
function ask(t,m,ok,fn){const c=csh();c.append(E('h3','',t));const p=E('p','mut',m);p.style.cssText='margin:0 10px 10px;max-width:280px;font-size:14px';c.append(p);
  const x=E('button','','Cancel');x.onclick=ctxClose;const d=E('button','del',ok);d.onclick=()=>{ctxClose();fn()};c.append(x,d);$('#ctx').classList.add('on')}
const ctxClose=()=>$('#ctx').classList.remove('on');
$('#ctx').onclick=e=>{if(e.target.id==='ctx')ctxClose()};
/* create / rename category dialog */
let nCb=null,nId=null,nOpt=null;
function nameBox(title,init,id,cb,opt){nOpt=opt||null;$('#nt').textContent=title;const i=$('#nn');i.value=init||'';i.placeholder=opt&&opt.ph||'Category name';i.maxLength=opt&&opt.max||30;i.setAttribute('autocapitalize',opt?'none':'sentences');$('#ne').textContent='';$('#nhint').textContent=opt&&opt.hint||'';$('#nok').disabled=false;nCb=cb;nId=id;$('#nbox').classList.add('on');setTimeout(()=>i.focus(),30)}
function nameOk(){const o=nOpt,n=o?$('#nn').value.trim().toLowerCase():cname($('#nn').value),e=o?o.val(n):nameErr(n,nId);if(e){$('#ne').textContent=e;return}
  if(o&&o.save){const b=$('#nok');if(b.disabled)return;b.disabled=true;$('#ne').textContent='';Promise.resolve(nCb(n)).then(er=>{b.disabled=false;if(er)$('#ne').textContent=er;else $('#nbox').classList.remove('on')})}
  else{$('#nbox').classList.remove('on');nCb&&nCb(n)}}
$('#nok').onclick=nameOk;$('#ncx').onclick=()=>$('#nbox').classList.remove('on');$('#nn').onkeydown=e=>{if(e.key==='Enter')nameOk()};
$('#nbox').onclick=e=>{if(e.target.id==='nbox')$('#nbox').classList.remove('on')};
/* Add Songs popup: multi-select from the Master Library; songs already in the category are locked */
let aSel=new Set(),aMode='cat',aTo=null;
function addItems(){
  const cat=aMode==='send'?null:curCat(),box=$('#aItems'),T=$('#aq').value.toLowerCase().split(/\s+/).filter(Boolean);box.textContent='';let L='';
  songs.filter(s=>{const h=((s.title||'')+' '+(s.artist||'')).toLowerCase();return T.every(w=>h.includes(w))}).sort((a,b)=>a.title.localeCompare(b.title,'id')).forEach(s=>{
    const has=!!cat&&cat.ids.includes(s.id),b=E('button','arow'+(aSel.has(s.id)?' sel':''));b.disabled=has;
    const m=E('span');m.append(UE('div','',s.title,'Untitled'),UE('small','mut',s.artist));
    b.append(E('span','chk',has?'✓':aSel.has(s.id)?'✓':''),m);if(has)b.append(E('em','','Already added'));
    b.onclick=()=>{if(aSel.has(s.id))aSel.delete(s.id);else{if(aMode==='send'&&aSel.size>=SEND_MAX)return void note('Maximum '+SEND_MAX+' songs per group',true);aSel.add(s.id)}b.classList.toggle('sel',aSel.has(s.id));b.firstChild.textContent=aSel.has(s.id)?'✓':'';aCount()};
    box.append(b)});
  if(!box.children.length)box.append(E('p','mut','No songs.'))}
function aCount(){const n=aSel.size;$('#aC').textContent=n+' selected';$('#aOK').disabled=!n;const v=aMode==='send'?'Send':'Add';$('#aOK').textContent=n?v+' ('+n+')':v}
/* v114: Create setlist. Choose where to pick from (All Songs or a category), select songs and press Add; go Back to pick from another place; Done puts the whole setlist, in order, into the queue (Next song). */
let slList=[],slSel=new Set(),slView='root',slSrc=null,slQ='';
const slSongs=()=>{const c=slSrc&&slSrc!=='all'?cats.find(x=>x.id===slSrc):null;return(c?c.ids.map(id=>songs.find(x=>x.id===id)).filter(Boolean):songs).slice().sort((a,b)=>(a.title||'').localeCompare(b.title||'','id'))};
function slOpen(){if(!songs.length)return void note('Your library is empty',true);slList=[];slSel=new Set();slView='root';slSrc=null;slQ='';slDraw();$('#slbox').classList.add('on')}
function slSideDraw(){const S=$('#slSide'),k=S.scrollTop;S.textContent='';S.append(E('div','fh','Setlist'));
  if(!slList.length)S.append(E('p','mut slempty','Songs you add appear here, in order.'));
  slList.forEach((id,i)=>{const x=songs.find(o=>o.id===id);if(!x)return;const r=E('div','slit'),t=UE('span','',x.title&&(i+1)+'. '+x.title,(i+1)+'. Untitled'),rm=E('button','','×');rm.type='button';rm.setAttribute('aria-label','Remove');rm.onclick=()=>{slList.splice(i,1);slDraw()};r.append(t,rm);S.append(r)});S.scrollTop=k}
function slDraw(){slSideDraw();const B=$('#slBody'),keep=B.querySelector('#slList')?B.querySelector('#slList').scrollTop:0;B.textContent='';
  $('#slX').textContent=slView==='root'?'Cancel':'Back';
  $('#slC').textContent=slList.length+(slList.length===1?' song in setlist':' songs in setlist');
  $('#slT').textContent=slView==='cats'?'Choose a category':slView==='songs'?(slSrc==='all'?'All Songs':((cats.find(x=>x.id===slSrc)||{}).name||'Category')):'Create setlist';
  if(slView==='root'){
    const mk=(t,n,f)=>{const b=E('button','slsrc');b.type='button';b.append(E('b','',t),E('small','mut',n));b.onclick=f;return b};
    B.append(E('p','mut slhint','Choose where to pick songs from. You can come back and pick from another place; press Set when the setlist is ready.'),
      mk('All Songs',songs.length+(songs.length===1?' song':' songs'),()=>{slView='songs';slSrc='all';slQ='';slDraw()}),
      mk('Categories',cats.length+(cats.length===1?' category':' categories'),()=>{slView='cats';slDraw()}));}
  else if(slView==='cats'){const L=E('div');L.id='slList';L.style.cssText='padding:0 10px 10px';
    [...cats].sort(byName).forEach(c=>{const b=E('button','arow');b.type='button';const m=E('span');m.append(UE('div','',c.name),E('small','mut',c.ids.length+(c.ids.length===1?' song':' songs')));b.append(m,E('em','','›'));b.onclick=()=>{slView='songs';slSrc=c.id;slQ='';slDraw()};L.append(b)});
    if(!cats.length)L.append(E('p','mut','No categories yet. Create one below.'));B.append(L)}
  else{const bar=E('div','slbar'),f=E('span','sfield'),i=E('input');i.placeholder='Search songs…';i.value=slQ;i.setAttribute('aria-label','Search songs');f.append(i);
    bar.append(f);B.append(bar);
    const L=E('div');L.id='slList';B.append(L);
    const fill=()=>{L.textContent='';const T=slQ.toLowerCase().split(/\s+/).filter(Boolean);
      slSongs().filter(x=>{const h=((x.title||'')+' '+(x.artist||'')).toLowerCase();return T.every(w=>h.includes(w))}).forEach(x=>{
        const inL=slList.indexOf(x.id),b=E('button','arow');b.type='button';b.disabled=inL>=0;
        const m=E('span');m.append(UE('div','',x.title,'Untitled'),UE('small','mut',x.artist));
        b.append(E('span','chk',inL>=0?String(inL+1):''),m);
        b.onclick=()=>{if(!slList.includes(x.id))slList.push(x.id);slDraw()};L.append(b)});
      if(!L.children.length)L.append(E('p','mut','No songs.'))};
    i.oninput=()=>{slQ=i.value;fill()};fill()}
  const L2=B.querySelector('#slList');if(L2)L2.scrollTop=keep}
$('#slX').onclick=()=>{if(slView==='root')return void $('#slbox').classList.remove('on');slView=slView==='songs'&&slSrc!=='all'?'cats':'root';slSel=new Set();slDraw()};
$('#slbox').onclick=e=>{if(e.target.id==='slbox')$('#slX').onclick()};
$('#slDone').onclick=()=>{const ids=[...new Set([...slList,...slSel])].filter(id=>songs.some(x=>x.id===id));$('#slbox').classList.remove('on');slSel=new Set();if(!ids.length)return;
  const fill=add=>{const q=Qs();if(!add)q.length=0;ids.forEach(id=>{if(!q.includes(id))q.push(id)});qFresh=null;const f=songs.find(x=>x.id===ids[0]);try{openSong(f)}catch(err){qSave();qRender();note('Could not open song',1);return}if(cur===f){const i=q.indexOf(f.id);if(i>=0)q.splice(i,1)} /* v115: Done opens the first lyric; the rest wait in Next song */
    qSave();qRender()};
  if(!Qs().length)return fill(false);
  const c=csh();c.append(E('h3','','Your queue is not empty'));const a=E('button','','Replace the queue');a.onclick=()=>{ctxClose();fill(false)};const b=E('button','','Add to the end');b.onclick=()=>{ctxClose();fill(true)};const x=E('button','','Cancel');x.onclick=ctxClose;c.append(a,b,x);$('#ctx').classList.add('on')};
function addOpen(){const cat=curCat();if(!cat)return;aMode='cat';aTo=null;aSel=new Set();$('#aT').textContent='Add Songs';$('#aq').value='';addItems();aCount();$('#addbox').classList.add('on')}
$('#aq').oninput=addItems;$('#aX').onclick=()=>{aSel=new Set();$('#addbox').classList.remove('on')};
$('#addbox').onclick=e=>{if(e.target.id==='addbox')$('#aX').onclick()};
$('#aOK').onclick=()=>{if(aMode==='send')return sendBatch();const cat=curCat();if(!cat||!aSel.size)return;let n=0;
  aSel.forEach(id=>{if(songs.some(s=>s.id===id)&&!cat.ids.includes(id)){cat.ids.push(id);n++}});
  save();aSel=new Set();$('#addbox').classList.remove('on');refresh();
  saveBad?note('Could not save changes',1):note(n+(n===1?' song':' songs')+' added to '+cat.name)};
$('#act').onclick=()=>{if(lib.v==='cat')addOpen();else nameBox('New category','',null,n=>{cats.push({id:cid(),name:n,ids:[]});save();refresh();note('Category created')})};
$('#q').oninput=refresh;$('#find').onclick=()=>{refresh();$('#q').focus()};
$('#sortb').onclick=()=>{const c=csh(),inCats=lib.v==='cats';c.append(E('h3','','Sort by'));
  (inCats?CSORTS:SORTS).forEach(([k,t])=>{const cur=inCats?catSortBy:sortBy,b=E('button','ck',t);b.append(E('i','',cur===k?'✓':''));b.onclick=()=>{if(inCats){catSortBy=k;try{localStorage.setItem(CSORTK,k)}catch(e){}}else{sortBy=k;try{localStorage.setItem(SORTK,k)}catch(e){}}ctxClose();refresh()};c.append(b)});
  $('#ctx').classList.add('on')};
