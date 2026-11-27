/* ---------- Cloud sync hooks (logic lives in cloud.js) ---------- */
function readLib(u){const a=u?K+':u:'+u:K,b=u?KC+':u:'+u:KC;let ex=false,s=[],c=[];
  try{const r=localStorage.getItem(a);if(r!=null){ex=true;const p=JSON.parse(r);if(Array.isArray(p))s=p.filter(x=>x&&x.id)}}catch(e){}
  try{const r=localStorage.getItem(b);if(r){const p=JSON.parse(r);if(Array.isArray(p))c=p.filter(x=>x&&x.id&&x.name).map(x=>({...x,ids:Array.isArray(x.ids)?x.ids:[]}))}}catch(e){}
  const ok=new Set(s.map(x=>x.id));c.forEach(x=>x.ids=[...new Set(x.ids)].filter(i=>ok.has(i)));return{songs:s,cats:c,exists:ex}}
if(window.Cloud)Cloud.init({
  client:()=>ensureClient(),
  get:()=>({songs,cats}),
  put:(s,c)=>{songs=s;cats=c;migVocal()},
  saveLocal,
  render:()=>refresh(),
  busy:()=>!$('#list').classList.contains('on'),
  notify:note,
  confirmMass:(n,c,t)=>Promise.resolve(confirm(L('Delete '+n+' of '+t+' songs from your account on every device? Cancel keeps your songs.','Hapus '+n+' dari '+t+' lagu dari akunmu di semua perangkat? Batal = lagumu tetap aman.'))),
  readLib,
  isSample:g=>JSON.stringify(g)===SAMPLE_J,
  useKeys:u=>{LK=u?K+':u:'+u:K;LKC=u?KC+':u:'+u:KC},
  activeUid:()=>LK===K?null:LK.slice(K.length+3),
  dropUser:u=>{try{localStorage.removeItem(K+':u:'+u);localStorage.removeItem(KC+':u:'+u)}catch(e){}},
  onStatus:()=>{const b=document.querySelector('#amenu .cst');if(b)b.textContent=Cloud.statusText()}
});
