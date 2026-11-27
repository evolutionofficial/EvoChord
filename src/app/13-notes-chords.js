/* ---------- v43: annotations (pen, text, shapes, images) drawn over the lyrics ----------
   An item is anchored to a lyric line (l) with an offset (y, in em of the lyric font) and a horizontal fraction (x), so it follows the line when the
   layout changes. Sizes are in em too. Stored as song.ann (synced with the song, not sent to friends).
   k: p pen {q:[[dx,dy]..]}, r/o/t/n rect/ellipse/triangle/line {a,b: vector}, x text {o: note style}, i image {a,b,src}. c colour key, w stroke. */
const ANC={o:'#f0a04b',r:'#ff5a5a',y:'#ffd23f',g:'#4ade80',b:'#6ab0ff',w:'#f3ece3'},ANW={1:.06,2:.12,3:.25},SVGNS='http://www.w3.org/2000/svg';
const svgEl=(n,a)=>{const e=document.createElementNS(SVGNS,n);for(const k in a)e.setAttribute(k,a[k]);return e},r2=n=>Math.round(n*100)/100;
/* v57: does auto-scroll pause at this section? Intro and Interlude pause by default, custom sections keep scrolling; both can be changed per section in the editor (song.stops) */
const baseOf=lo=>lo.replace(/\s*\d+$/,''),stopDef=lo=>/^(intro|interlude)/.test(lo);
const stopOf=(s,lo)=>{const v=s&&s.stops&&s.stops[lo];return v==='p'?true:v==='k'?false:stopDef(lo)};
let STDL=null;
const stopEligible=lo=>{if(!STDL)STDL=new Set(SECS.concat(SEC_OLD).map(n=>baseOf(n.toLowerCase())));return stopDef(lo)||!STDL.has(baseOf(lo))};
function buildLines(t,lyr,colors,onSec){const le=[];let col='',lastSec=null;
  (lyr||'').split('\n').forEach(ln=>{let d,add=true;const no=noteParse(ln);
    if(no){d=E('div','note',no.t);noteStyle(d,no);lastSec=null}
    else{const m=ln.trim().match(/^\[(.+)\]$/);
      if(m){const n=m[1],lo=n.toLowerCase(),lc=lblColor({colors},lo),g=isGen(lo);
        if(g&&lastSec){d=lastSec;add=false;const tg=E('span','gtag',n);tg.style.color=lc;d.append(tg);lastSec=null;col=lc} /* beside the section name */
        else{d=E('div','sec',n);d.style.color=lc;d.dataset.k=lo;if(onSec)onSec(d,n,lc);col=g?lc:'';lastSec=g?null:d}}
      else{d=lineEl(ln,col);if(ln.trim())lastSec=null}}
    if(add)t.append(d);le.push(d)});
  return le}
/* v74: annotations are anchored to a CHARACTER of the lyrics (line l, character index ch); ox/oy are the offset (in em of the lyric font) from the centre of that
   character to the item's start point. The position is read from the real text layout every time, so when the lyrics are zoomed or re-wrap, the mark
   moves with its word/letter instead of staying at a place in the container. Older items (line + em offsets) are converted the first time they are drawn. */
const chOrigin=t=>{const r=t.getBoundingClientRect();return{x:r.left,y:r.top}};
function chNodes(el){const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),a=[];let n,o=0;while(n=w.nextNode()){a.push([n,o]);o+=n.data.length}return a}
function chRect(el,c,nodes){nodes=nodes||chNodes(el);for(const[nd,o]of nodes){if(c>=o&&c<o+nd.data.length){const r=document.createRange();r.setStart(nd,c-o);r.setEnd(nd,c-o+1);const q=r.getClientRects();return q.length?q[0]:null}}return null}
function annCentre(el,c,O){const len=(el.textContent||'').length,r=c>=0&&len?chRect(el,Math.min(c,len-1)):null,b=r||el.getBoundingClientRect();return{x:b.left+b.width/2-O.x,y:b.top+b.height/2-O.y}}
function annNearest(t,le,em,qx,qy){const O=chOrigin(t),px=O.x+qx,py=O.y+qy;let best=null,bd=1e18;
  le.forEach((el,l)=>{const b=el.getBoundingClientRect();if(b.bottom<py-4*em||b.top>py+4*em)return;const nodes=chNodes(el),txt=el.textContent;
    for(let c=0;c<txt.length;c++){if(/\s/.test(txt[c]))continue;const r=chRect(el,c,nodes);if(!r)continue;
      const dx=px<r.left?r.left-px:px>r.right?px-r.right:0,dy=py<r.top?r.top-py:py>r.bottom?py-r.bottom:0,d=dx*dx+dy*dy;if(d<bd){bd=d;best={l,c}}}});
  if(!best){let i=0,bdist=1e18;le.forEach((el,l)=>{const b=el.getBoundingClientRect(),d=Math.abs((b.top+b.bottom)/2-py);if(d<bdist){bdist=d;i=l}});best={l:i,c:-1}}
  return best}
function annAnchor(t,le,em,sx,sy,qx,qy){const n=annNearest(t,le,em,qx==null?sx:qx,qy==null?sy:qy),c=annCentre(le[n.l],n.c,chOrigin(t));return{l:n.l,ch:n.c,ox:r2((sx-c.x)/em),oy:r2((sy-c.y)/em)}}
function annPos(it,t,le,em){const el=le[Math.min(Math.max(it.l|0,0),le.length-1)];
  if(it.ch==null){const W=t.clientWidth;return{x:it.xe!=null?W/2+it.xe*em:it.x*W,y:(el?el.offsetTop:0)+it.y*em}} /* legacy */
  const c=annCentre(el,it.ch,chOrigin(t));return{x:c.x+it.ox*em,y:c.y+it.oy*em}}
let annMig=false;
function annMigrate(it,t,le,em){annMig=true;const p=annPos(it,t,le,em);let qx=p.x,qy=p.y;
  if(it.k==='p'&&it.q&&it.q.length){let sx=0,sy=0;it.q.forEach(q=>{sx+=q[0];sy+=q[1]});qx+=sx/it.q.length*em;qy+=sy/it.q.length*em}
  else if(it.a!=null&&it.k!=='x'){qx+=it.a*em/2;qy+=(it.b||0)*em/2}
  const a=annAnchor(t,le,em,p.x,p.y,qx,qy);delete it.xe;delete it.x;delete it.y;Object.assign(it,a)}
/* v73: annotations point at a lyric line by index. When the lyrics are edited (lines inserted, deleted or changed) the indices are re-mapped by
   aligning the old and new text (longest common subsequence), so every annotation stays on the line it was drawn on. */
function annRemap(items,A,B){const n=A.length,m=B.length;if(!items||!items.length||!n||!m||n*m>4e6)return;
  const dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=A[i]===B[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const map=new Array(n).fill(-1);let i=0,j=0;
  while(i<n&&j<m){if(A[i]===B[j]){map[i]=j;i++;j++}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++}
  for(let k=0;k<n;k++){if(map[k]>=0)continue;
    let p=k-1;while(p>=0&&map[p]<0)p--;let q=k+1;while(q<n&&map[q]<0)q++;
    const pn=p>=0?map[p]:-1,qn=q<n?map[q]:m,lo=pn+1,hi=qn-1;
    map[k]=hi>=lo?Math.min(lo+(k-(p+1)),hi):Math.max(0,Math.min(m-1,pn>=0?pn:qn))}
  items.forEach(it=>{const l=it.l|0;if(l>=0&&l<n)it.l=map[l]})}
function shapeNode(k,x,y,a,b,at){let e;
  if(k==='r')e=svgEl('rect',{x:Math.min(x,x+a),y:Math.min(y,y+b),width:Math.abs(a),height:Math.abs(b),rx:3});
  else if(k==='o')e=svgEl('ellipse',{cx:x+a/2,cy:y+b/2,rx:Math.abs(a)/2,ry:Math.abs(b)/2});
  else if(k==='t')e=svgEl('polygon',{points:(x+a/2)+','+y+' '+(x+a)+','+(y+b)+' '+x+','+(y+b)});
  else e=svgEl('line',{x1:x,y1:y,x2:x+a,y2:y+b});
  for(const q in at)e.setAttribute(q,at[q]);return e}
function annDraw(layer,items,t,em,sel){
  layer.textContent='';const le=t._le||[],W=t.clientWidth,svg=svgEl('svg',{class:'ansvg'});layer.append(svg);if(!le.length)return;
  items.forEach((it,i)=>{if(it.ch==null)annMigrate(it,t,le,em);
    const p=annPos(it,t,le,em),col=adapt(ANC[it.c]||ANC.o),sw=Math.max(1,(it.w||.12)*em);
    if(it.k==='x'||it.k==='i'){let d;
      if(it.k==='x'){d=E('div','anx',it.o.t);noteStyle(d,it.o);d.style.margin='0'}
      else{d=E('img','ani');d.alt='';d.src=it.src;d.style.width=it.a*em+'px';d.style.height=it.b*em+'px';d.draggable=false}
      d.style.left=p.x+'px';d.style.top=p.y+'px';d.setAttribute('data-i',i);if(i===sel)d.classList.add('sel');layer.append(d);return}
    const g=svgEl('g',{'data-i':i}),at={fill:'none',stroke:col,'stroke-width':sw,'stroke-linecap':'round','stroke-linejoin':'round'};let s;
    if(it.k==='p')s=svgEl('path',{d:'M'+r2(p.x)+' '+r2(p.y)+it.q.map(q=>' L'+r2(p.x+q[0]*em)+' '+r2(p.y+q[1]*em)).join('')});
    else s=shapeNode(it.k,p.x,p.y,it.a*em,it.b*em,{});
    for(const q in at)s.setAttribute(q,at[q]);
    const h=s.cloneNode();h.setAttribute('stroke','transparent');h.setAttribute('stroke-width',Math.max(sw,22));h.setAttribute('class','anhit');
    g.append(s,h);if(i===sel)g.classList.add('sel');svg.append(g)})}
function annPlay(){const t=$('#txt');let l=t.querySelector(':scope>.annl');
  if(!cur||!cur.ann||!cur.ann.length||!t._le){if(l)l.remove();return}
  if(!l){l=E('div','annl');t.append(l)}annDraw(l,cur.ann,t,cur.font,-1);if(annMig){annMig=false;save()}}
let an=null;
const anRedraw=()=>{if(an)annDraw($('#anlay'),an.items,$('#antx'),an.em,an.sel)};
function anSnap(){const j=JSON.stringify(an.items);if(an.h[an.hi]===j)return;an.h=an.h.slice(0,an.hi+1);an.h.push(j);an.hi=an.h.length-1;if(an.h.length>60){an.h.shift();an.hi--}}
function anGo(d){const n=an.hi+d;if(n<0||n>=an.h.length)return;an.hi=n;an.items=JSON.parse(an.h[n]);an.sel=-1;anRedraw();anUi()}
function openAnn(){if(ed.ann&&ed.ann.length&&ed.annLyr!=null&&ed.annLyr!==ta.value)annRemap(ed.ann,ed.annLyr.split('\n'),ta.value.split('\n'));ed.annLyr=ta.value;const f=ed.s?ed.s.font:ed.base?ed.base.font:defFont(),t=$('#antx'),start=JSON.stringify(ed.ann||[]);
  an={items:JSON.parse(start),sel:-1,tool:'pen',shape:'r',c:'o',w:2,em:f,h:[start],hi:0,start,dr:null};
  t.textContent='';t.style.fontSize=f+'px';t._le=buildLines(t,ta.value,ed.colors);
  const lay=E('div','annl ed');lay.id='anlay';const cap=E('div','ancap');cap.id='ancap';t.append(lay,cap);if(anBindCap)anBindCap(cap);
  anInit();show('ann');$('#anl').scrollTop=0;anTool('pen');requestAnimationFrame(anRedraw)}
let anReady=false,anBindCap=null;
function anInit(){if(anReady)return;anReady=true;
  const O=$('#anO');
  Object.keys(ANC).forEach(k=>{const b=E('button','asw');b.type='button';b.dataset.c=k;b.style.setProperty('--c',ANC[k]);b.setAttribute('aria-label','Colour '+k);O.append(b)});
  [['1','Thin'],['2','Mid'],['3','Thick']].forEach(([w,tx])=>{const b=E('button','',tx);b.type='button';b.dataset.w=w;O.append(b)});
  [['anU','Undo'],['anR','Redo'],['anC','Clear']].forEach(([id,tx])=>{const b=E('button','',tx);b.type='button';b.id=id;O.append(b)});
  O.onclick=e=>{const b=e.target.closest('button');if(!b||!an)return;
    if(b.dataset.c){an.c=b.dataset.c;const it=an.items[an.sel];if(it&&it.k!=='x'&&it.k!=='i'){it.c=an.c;anSnap();anRedraw()}}
    else if(b.dataset.w){an.w=+b.dataset.w;const it=an.items[an.sel];if(it&&it.k!=='x'&&it.k!=='i'){it.w=ANW[an.w];anSnap();anRedraw()}}
    else if(b.id==='anU')anGo(-1);else if(b.id==='anR')anGo(1);
    else if(b.id==='anC'){if(an.items.length)ask('Clear all annotations?','Everything drawn on this song will be removed.','Clear',()=>{an.items=[];an.sel=-1;anSnap();anRedraw();anUi()})}
    anUi()};
  $('#anT').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='anImg'){$('#anFile').click();return}if(b.dataset.t)anTool(b.dataset.t)};
  $('#anShape').onclick=e=>{const b=e.target.closest('button');if(b&&an){an.shape=b.dataset.s;anUi()}};
  $('#anDel').onclick=()=>{if(!an||an.sel<0)return;an.items.splice(an.sel,1);an.sel=-1;anSnap();anRedraw();anUi()};
  $('#anEd').onclick=()=>{const it=an&&an.items[an.sel];if(!it||it.k!=='x')return;noteOpen(-1,o=>{it.o=o;anSnap();anRedraw()},it.o,()=>{an.items.splice(an.sel,1);an.sel=-1;anSnap();anRedraw();anUi()})};
  $('#anFile').onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(f)anImage(f)};
  $('#anOK').onclick=anDone;$('#anX').onclick=anBack;
  const lay=()=>$('#anlay');
  /* Move / Erase: pointer events land on the items themselves */
  $('#antx').addEventListener('pointerdown',e=>{if(!an||(an.tool!=='sel'&&an.tool!=='erase'))return;const n=e.target.closest&&e.target.closest('[data-i]');if(!n){if(an.sel>=0){an.sel=-1;anRedraw();anUi()}return}
    const i=+n.getAttribute('data-i'),it=an.items[i];if(!it)return;
    if(an.tool==='erase'){an.items.splice(i,1);anSnap();anRedraw();return}
    e.preventDefault();an.sel=i;anRedraw();anUi();
    const node=$('#antx').querySelector('[data-i="'+i+'"]'),t=$('#antx'),W=t.clientWidth,x0=e.clientX,y0=e.clientY,pid=e.pointerId;let moved=false;
    const mv=ev=>{if(ev.pointerId!==pid)return;const dx=ev.clientX-x0,dy=ev.clientY-y0;if(!moved&&Math.hypot(dx,dy)<4)return;moved=true;
      if(node.tagName==='g')node.setAttribute('transform','translate('+dx+','+dy+')');else node.style.translate=dx+'px '+dy+'px'};
    const up=ev=>{if(ev.pointerId!==pid)return;document.removeEventListener('pointermove',mv);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);
      if(moved&&ev.type==='pointerup'){const O=chOrigin(t),p=annPos(it,t,t._le,an.em),r=node.getBoundingClientRect(),a=annAnchor(t,t._le,an.em,p.x+ev.clientX-x0,p.y+ev.clientY-y0,r.left+r.width/2-O.x,r.top+r.height/2-O.y);Object.assign(it,a);anSnap()}anRedraw()};
    document.addEventListener('pointermove',mv);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up)});
  /* Pen / Shape / Text: the capture layer takes the touch. v87: the layer is created again every time Annotate opens, so these listeners are bound
     to each new layer (before, only the first one had them and the pen stopped working from the second visit on). */
  anBindCap=cap=>{
  cap.addEventListener('pointerdown',e=>{if(!an||!['pen','shape','text'].includes(an.tool)||!e.isPrimary)return;if(an.dr){if(an.dr.el)an.dr.el.remove();an.dr=null} /* a stroke that never got its pointerup must not lock drawing */
    e.preventDefault();try{cap.setPointerCapture(e.pointerId)}catch(_){}
    const r=cap.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;an.dr={x0:x,y0:y,pts:[[x,y]],pid:e.pointerId,el:null,mv:0}});
  cap.addEventListener('pointermove',e=>{const d=an&&an.dr;if(!d||e.pointerId!==d.pid)return;const r=cap.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    if(Math.hypot(x-d.x0,y-d.y0)>5)d.mv=1;const svg=$('#anlay .ansvg'),col=adapt(ANC[an.c]),sw=Math.max(1,ANW[an.w]*an.em);
    if(an.tool==='pen'){const l=d.pts[d.pts.length-1];if(Math.hypot(x-l[0],y-l[1])<1.5)return;d.pts.push([x,y]);
      if(!d.el){d.el=svgEl('path',{fill:'none',stroke:col,'stroke-width':sw,'stroke-linecap':'round','stroke-linejoin':'round'});svg.append(d.el)}
      d.el.setAttribute('d','M'+d.pts.map(q=>q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' L'))}
    else if(an.tool==='shape'){if(d.el)d.el.remove();d.el=shapeNode(an.shape,d.x0,d.y0,x-d.x0,y-d.y0,{fill:'none',stroke:col,'stroke-width':sw,'stroke-linecap':'round','stroke-linejoin':'round'});svg.append(d.el);d.x1=x;d.y1=y}});
  const end=e=>{const d=an&&an.dr;if(!d||e.pointerId!==d.pid)return;an.dr=null;if(d.el)d.el.remove();if(e.type==='pointercancel')return;
    const t=$('#antx'),em=an.em;let qx=d.x0,qy=d.y0;
    if(an.tool==='pen'&&d.pts.length>1){let a=1e9,b=-1e9,c=1e9,e2=-1e9;d.pts.forEach(q=>{a=Math.min(a,q[0]);b=Math.max(b,q[0]);c=Math.min(c,q[1]);e2=Math.max(e2,q[1])});qx=(a+b)/2;qy=(c+e2)/2}
    else if(an.tool==='shape'&&d.x1!=null){qx=(d.x0+d.x1)/2;qy=(d.y0+d.y1)/2}
    const A=annAnchor(t,t._le,em,d.x0,d.y0,qx,qy);
    if(an.tool==='pen'){const pts=d.pts.length>1?d.pts:[[d.x0,d.y0],[d.x0+.1,d.y0]];an.items.push({k:'p',...A,c:an.c,w:ANW[an.w],q:pts.map(q=>[r2((q[0]-d.x0)/em),r2((q[1]-d.y0)/em)])})}
    else if(an.tool==='shape'){if(d.x1==null||Math.hypot(d.x1-d.x0,d.y1-d.y0)<6)return;an.items.push({k:an.shape,...A,c:an.c,w:ANW[an.w],a:r2((d.x1-d.x0)/em),b:r2((d.y1-d.y0)/em)})}
    else if(an.tool==='text'){if(d.mv)return;noteOpen(-1,o=>{an.items.push({k:'x',...A,o});an.sel=an.items.length-1;anSnap();anRedraw();anTool('sel')},{...NOTE_DEF,t:''});return}
    anSnap();anRedraw();anUi()};
  cap.addEventListener('pointerup',end);cap.addEventListener('pointercancel',end);cap.addEventListener('lostpointercapture',e=>{if(an&&an.dr&&e.pointerId===an.dr.pid){if(an.dr.el)an.dr.el.remove();an.dr=null}})};
  anBindCap($('#ancap'));
  addEventListener('resize',()=>{if($('#ann').classList.contains('on'))anRedraw()})}
function anTool(k){if(!an)return;an.tool=k;if(k!=='sel')an.sel=-1;const cap=$('#ancap'),lay=$('#anlay');
  cap.style.pointerEvents=['pen','shape','text'].includes(k)?'auto':'none';lay.className='annl ed t-'+k;anRedraw();anUi()}
function anUi(){if(!an)return;
  document.querySelectorAll('#anT [data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===an.tool));
  document.querySelectorAll('#anO .asw').forEach(b=>b.classList.toggle('on',b.dataset.c===an.c));
  document.querySelectorAll('#anO [data-w]').forEach(b=>b.classList.toggle('on',+b.dataset.w===an.w));
  document.querySelectorAll('#anShape [data-s]').forEach(b=>b.classList.toggle('on',b.dataset.s===an.shape));
  $('#anShape').hidden=an.tool!=='shape';
  const it=an.items[an.sel];$('#anSel').hidden=!it;$('#anEd').hidden=!it||it.k!=='x';
  $('#anU').disabled=an.hi<=0;$('#anR').disabled=an.hi>=an.h.length-1;$('#anC').disabled=!an.items.length}
function anImage(f){if(an.items.filter(i=>i.k==='i').length>=8){toast('Maximum 8 images per song');return}
  const url=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{URL.revokeObjectURL(url);const m=Math.min(1,380/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*m)),h=Math.max(1,Math.round(im.height*m)),c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d');x.drawImage(im,0,0,w,h);const png=/png|gif|webp/i.test(f.type),src=c.toDataURL(png?'image/png':'image/jpeg',.75);
    if(src.length>200000){toast('Image is too large');return}
    const t=$('#antx'),W=t.clientWidth,em=an.em,L=$('#anl'),dw=Math.min(w,W*.5),yy=L.scrollTop+L.clientHeight/2,A=annAnchor(t,t._le,em,W/2,yy,W/2,yy);
    an.items.push({k:'i',...A,a:r2(dw/em),b:r2(dw*h/w/em),src});an.sel=an.items.length-1;anSnap();anTool('sel')};
  im.onerror=()=>{URL.revokeObjectURL(url);toast('Image could not be read')};im.src=url}
function anDone(){if(!an)return;const j=JSON.stringify(an.items);if(j!==an.start){ed.ann=an.items;ed.dirty=true}an=null;show('edit')}
function anBack(){if(!an){show('edit');return}if(JSON.stringify(an.items)===an.start){an=null;show('edit');return}ask('Discard annotations?','Your drawing changes on this page will be lost.','Discard',()=>{an=null;show('edit')})}
/* v42: note editor, note bar, and the Move (arrange) tool */
const lineIdx=()=>ta.value.slice(0,ta.selectionStart).split('\n').length-1;
function setLines(L,ci){ta.value=L.join('\n');ci=Math.max(0,Math.min(ci,L.length-1));const pos=L.slice(0,ci).join('\n').length+(ci>0?1:0);ta.setSelectionRange(pos,pos);snap();ed.dirty=true;secInfo()}
function noteInfo(){const bar=$('#notebar');if(!bar)return;const o=noteParse(ta.value.split('\n')[lineIdx()]);
  if(!o){bar.hidden=true;return}bar.hidden=false;const n=$('#nbn');n.setAttribute('data-nt','');n.textContent=L('Note: ','Catatan: ')+(o.t.length>24?o.t.slice(0,24)+'…':o.t);n.style.color=NC[o.c]||NC.w}
let nbCur=null;
const NGROUPS=[['s','Size',[['1','S'],['2','M'],['3','L'],['4','XL']]],['w','Weight',[['l','Light'],['r','Regular'],['b','Bold']]],['f','Font',[['','Same'],['s','Serif'],['m','Mono'],['h','Hand']]],['a','Align',[['l','Left'],['c','Center'],['r','Right']]]];
function nbPrev(){const p=$('#nbprev');p.textContent='';const d=UE('div','note',$('#nbtx').value.trim(),'Your note');noteStyle(d,nbCur.o);p.append(d)}
function nbBuild(){const box=$('#nbseg');box.textContent='';const o=nbCur.o;
  const row=(label,fill)=>{const r=E('div','nrow2'),g=E('div','nseg');r.append(E('span','',label),g);fill(g);box.append(r)};
  NGROUPS.forEach(([k,label,opts])=>row(label,g=>opts.forEach(([v,t])=>{const b=E('button',o[k]===v?'on':'',t);b.type='button';b.onclick=()=>{o[k]=v;[...g.children].forEach(x=>x.classList.toggle('on',x===b));nbPrev()};g.append(b)})));
  row('Colour',g=>Object.keys(NC).forEach(v=>{const b=E('button','nsw'+(o.c===v?' on':''));b.type='button';b.style.setProperty('--c',NC[v]);b.setAttribute('aria-label','Colour '+v);b.onclick=()=>{o.c=v;[...g.children].forEach(x=>x.classList.toggle('on',x===b));nbPrev()};g.append(b)}));
  row('Style',g=>[['i','Italic'],['x','Box']].forEach(([k,t])=>{const b=E('button',o[k]?'on':'',t);b.type='button';b.onclick=()=>{o[k]=o[k]?'':'1';b.classList.toggle('on',!!o[k]);nbPrev()};g.append(b)}));
  nbPrev()}
function noteOpen(idx,cb,o0,del){const o=cb?o0:idx>=0?noteParse(ta.value.split('\n')[idx]):null;nbCur={idx,cb,del,o:o?{...NOTE_DEF,...o}:{...NOTE_DEF,t:''}};
  $('#nbt').textContent=(cb?o0&&o0.t:idx>=0)?'Edit note':'New note';$('#nbtx').value=nbCur.o.t;$('#nbdel').hidden=cb?!del:idx<0;nbBuild();$('#notebox').classList.add('on');setTimeout(()=>$('#nbtx').focus(),40)}
const closeNote=()=>{$('#notebox').classList.remove('on');nbCur=null};
$('#nbtx').addEventListener('input',()=>{if(nbCur)nbPrev()});
$('#nbcancel').onclick=closeNote;$('#notebox').onclick=e=>{if(e.target.id==='notebox')closeNote()};
$('#nbok').onclick=()=>{if(!nbCur)return;const t=$('#nbtx').value.replace(/\s+/g,' ').trim();if(!t){$('#nbtx').focus();return}
  const o={...nbCur.o,t};if(nbCur.cb){const cb=nbCur.cb;closeNote();cb(o);return}
  const L=ta.value.split('\n');snap();let ci;
  if(nbCur.idx>=0){L[nbCur.idx]=noteStr(o);ci=nbCur.idx}else{ci=lineIdx()+1;L.splice(ci,0,noteStr(o))}
  closeNote();setLines(L,ci)};
$('#nbdel').onclick=()=>{if(nbCur&&nbCur.cb){const d=nbCur.del;closeNote();d&&d();return}if(!nbCur||nbCur.idx<0)return;const L=ta.value.split('\n'),i=nbCur.idx;snap();L.splice(i,1);closeNote();setLines(L,i)};
/* Chords (secret, beta): chord editor screen. One box per 2 characters of the visible lyric text (spaces count); tap a box and type the chord on the chord keyboard. */
let chs=null;
const chVis=ln=>ln.replace(/\{[roygbiv]:([^{}]*)\}/g,'$1');
const CH_TOK=/(maj7|sus|dim|aug|add|[A-G]|[#b]|m|\/|\d)$/;
function chCan(b,k){
  if(/^[A-G]$/.test(k))return true;
  if(b.length>=12)return false;
  if(k==='#'||k==='b')return /[A-G]$/.test(b);
  if(k==='m')return /^[A-G][#b]?$/.test(b);
  if(k==='/')return /^[A-G]/.test(b)&&!b.includes('/');
  return /^[A-G]/.test(b)&&!b.includes('/')}
function chAdd(b,k){if(!chCan(b,k))return b;if(/^[A-G]$/.test(k)&&!b.endsWith('/'))return k;return b+k}
function chNow(){return Object.keys(chs.map).map(k=>{const p=k.split(':');return{l:+p[0],c:+p[1],n:chs.map[k]}}).sort((a,b)=>a.l-b.l||a.c-b.c)}
function openChd(){if(!ed)return;const lyr=ta.value;
  if(ed.chords&&ed.chords.length&&ed.chLyr!=null&&ed.chLyr!==lyr)annRemap(ed.chords,ed.chLyr.split('\n'),lyr.split('\n'));ed.chLyr=lyr;
  chs={map:{},sel:-1,cells:[],buf:''};(ed.chords||[]).forEach(it=>{if(it&&it.n)chs.map[it.l+':'+it.c]=String(it.n)});
  chBuild(lyr);chs.start=JSON.stringify(chNow());chKbBuild();show('chd');$('#chl').scrollTop=0;chSelect(-1)}
function chBuild(lyr){const box=$('#chtx');box.textContent='';chs.cells=[];const keep={};
  lyr.split('\n').forEach((ln,l)=>{const tr=ln.trim();
    if(!tr){box.append(E('div','chgap'));return}
    if(/^\[.+\]$/.test(tr)){box.append(E('div','chsec',tr.slice(1,-1)));return}
    if(noteParse(ln))return;
    const v=chVis(ln),row=E('div','chrow');
    for(let c=0;c<v.length;c+=2){const k=l+':'+c,cell=E('button','chc');cell.type='button';cell.dataset.i=chs.cells.length;
      const n=E('b','chn',chs.map[k]||''),t=E('span','cht',v.slice(c,c+2));cell.append(n,t);row.append(cell);chs.cells.push({l,c,el:cell,nEl:n});if(chs.map[k])keep[k]=chs.map[k]}
    box.append(row)});
  chs.map=keep}
function chSelect(i){if(!chs)return;chs.cells.forEach(x=>x.el.classList.remove('on'));const k=$('#chkb');
  if(i<0||i>=chs.cells.length){chs.sel=-1;k.hidden=true;return}
  chs.sel=i;const x=chs.cells[i];x.el.classList.add('on');k.hidden=false;chs.buf=chs.map[x.l+':'+x.c]||'';chKbState();
  try{x.el.scrollIntoView({block:'nearest'})}catch(e){}}
function chSet(n){const x=chs&&chs.cells[chs.sel];if(!x)return;const k=x.l+':'+x.c;if(n)chs.map[k]=n;else delete chs.map[k];x.nEl.textContent=n||'';chs.buf=n||'';chKbState()}
const CH_ROWS=[['C','D','E','F','G','A','B'],['#','b','m','7','maj7','sus','/'],['2','4','6','9','dim','aug','add']];
function chKbBuild(){const k=$('#chkb');if(k.dataset.ok)return;k.dataset.ok='1';
  k.append(E('div','chcur'),E('div','chrec'));
  CH_ROWS.forEach(r=>{const d=E('div','kr');r.forEach(t=>{const b=E('button','',t);b.type='button';b.dataset.k=t;d.append(b)});k.append(d)});
  const d=E('div','kr');[['prev','◀',''],['next','▶',''],['bs','⌫',''],['clr','Clear','wide'],['done','Done','wide ok']].forEach(([a,t,c])=>{const b=E('button',c,t);b.type='button';b.dataset.a=a;b.setAttribute('aria-label',a==='prev'?'Previous box':a==='next'?'Next box':a==='bs'?'Backspace':t);d.append(b)});k.append(d);
  k.onclick=e=>{const b=e.target.closest('button');if(!b||!chs||chs.sel<0||b.disabled)return;
    if(b.dataset.r){chSet(b.dataset.r);chSelect(Math.min(chs.sel+1,chs.cells.length-1));return}
    if(b.dataset.k){chSet(chAdd(chs.buf,b.dataset.k));return}
    const a=b.dataset.a;
    if(a==='prev')chSelect(Math.max(0,chs.sel-1));
    else if(a==='next')chSelect(Math.min(chs.cells.length-1,chs.sel+1));
    else if(a==='bs')chSet(chs.buf.replace(CH_TOK,''));
    else if(a==='clr')chSet('');
    else if(a==='done')chSelect(-1)}}
function chKbState(){const k=$('#chkb');if(!chs)return;k.querySelector('.chcur').textContent=chs.buf||'–';
  k.querySelectorAll('[data-k]').forEach(b=>{b.disabled=!chCan(chs.buf,b.dataset.k)});
  const r=k.querySelector('.chrec');r.textContent='';const seen=[];chNow().forEach(it=>{if(!seen.includes(it.n))seen.push(it.n)});
  seen.slice(0,10).forEach(n=>{const b=E('button','',n);b.type='button';b.dataset.r=n;r.append(b)})}
function chDone(){if(!chs)return;const items=chNow(),j=JSON.stringify(items);if(j!==chs.start){ed.chords=items;ed.chLyr=ta.value;ed.dirty=true}chs=null;show('edit')}
function chBack(){if(!chs){show('edit');return}if(JSON.stringify(chNow())===chs.start){chs=null;show('edit');return}ask('Discard chords?','Your chord changes on this page will be lost.','Discard',()=>{chs=null;show('edit')})}
$('#chtx').addEventListener('click',e=>{const c=e.target.closest('.chc');if(c&&chs)chSelect(+c.dataset.i)});
$('#chOK').onclick=chDone;$('#chX').onclick=chBack;
let CHORD_ON=true; /* Chords: shown in the play screen whenever the song has chords; edited from the bottom of the Key dropdown */
$('#eN').onclick=()=>openAnn();
$('#nbEdit').onclick=()=>noteOpen(lineIdx());
$('#nbRm').onclick=()=>{const L=ta.value.split('\n'),i=lineIdx();if(!noteParse(L[i]))return;snap();L.splice(i,1);setLines(L,i)};
$('#nbMove').onclick=()=>arrOpen(lineIdx());
/* Move tool: a list of every line; notes can be dragged by their handle to any position */
let drag=null,arLast=null;
function arrOpen(sel){const L=ta.value.split('\n'),box=$('#arl');box.textContent='';let selRow=null;arLast=null;
  L.forEach((ln,i)=>{const row=E('div','ar'),o=noteParse(ln);row._raw=ln;
    if(o){row.classList.add('nt');const h=E('span','arh','⋮⋮');h.setAttribute('role','button');h.setAttribute('aria-label','Drag to move this note');
      const tx=E('span','art',o.t);tx.style.color=NC[o.c]||NC.w;tx.style.fontWeight=o.w==='b'?700:o.w==='l'?300:400;tx.style.fontStyle=o.i?'italic':'normal';row.append(h,tx);
      h.addEventListener('pointerdown',e=>arStart(e,row));if(i===sel){row.classList.add('sel');selRow=row;arLast=row}}
    else if(/^\[.+\]$/.test(ln.trim())){const nm=ln.trim().slice(1,-1),t=E('span','art',nm);row.classList.add('lb');row.style.color=lblColor({colors:ed&&ed.colors},nm.toLowerCase());row.append(t)}
    else if(!ln.trim())row.classList.add('bl');
    else{row.classList.add('lt');row.append(E('span','art',ln.replace(/\{[roygbiv]:([^{}]*)\}/g,'$1')))}
    box.append(row)});
  $('#arr').classList.add('on');if(selRow)setTimeout(()=>selRow.scrollIntoView({block:'center'}),30)}
function arStart(e,row){e.preventDefault();if(drag)return;drag={row,y:e.clientY,pid:e.pointerId,ind:E('div','arind'),raf:0};row.classList.add('drag');arLast=row;
  document.addEventListener('pointermove',arMove);document.addEventListener('pointerup',arEnd);document.addEventListener('pointercancel',arEnd);arTick()}
function arMove(e){if(drag&&e.pointerId===drag.pid)drag.y=e.clientY}
function arTick(){if(!drag)return;const box=$('#arl'),r=box.getBoundingClientRect(),y=drag.y,row=drag.row;
  if(y<r.top+56)box.scrollTop-=12;else if(y>r.bottom-56)box.scrollTop+=12;
  row.style.transform='';const nat=r.top-box.scrollTop+row.offsetTop+row.offsetHeight/2;row.style.transform='translateY('+(y-nat)+'px)';
  let before=null;for(const c of box.children){if(c===row||c===drag.ind)continue;const b=c.getBoundingClientRect();if(y<b.top+b.height/2){before=c;break}}
  if(drag.ind.nextSibling!==before||!drag.ind.parentNode)box.insertBefore(drag.ind,before);
  drag.raf=requestAnimationFrame(arTick)}
function arEnd(e){if(!drag||(e&&e.pointerId!=null&&e.pointerId!==drag.pid))return;cancelAnimationFrame(drag.raf);const{row,ind}=drag;row.style.transform='';row.classList.remove('drag');
  if(ind.parentNode){ind.parentNode.insertBefore(row,ind);ind.remove()}drag=null;
  document.removeEventListener('pointermove',arMove);document.removeEventListener('pointerup',arEnd);document.removeEventListener('pointercancel',arEnd)}
const arClose=()=>{arEnd();$('#arr').classList.remove('on')};
$('#arX').onclick=arClose;
$('#arOK').onclick=()=>{arEnd();const rows=[...$('#arl').children],lines=rows.map(r=>r._raw);
  if(lines.join('\n')!==ta.value){snap();setLines(lines,arLast?rows.indexOf(arLast):lineIdx())}
  $('#arr').classList.remove('on')};
$('#eS').onclick=()=>{
  snap();const lyr=ta.value;
  if(ed.ann&&ed.ann.length&&ed.annLyr!=null&&ed.annLyr!==lyr)annRemap(ed.ann,ed.annLyr.split('\n'),lyr.split('\n'));ed.annLyr=lyr;if(ed.chords&&ed.chords.length&&ed.chLyr!=null&&ed.chLyr!==lyr)annRemap(ed.chords,ed.chLyr.split('\n'),lyr.split('\n'));ed.chLyr=lyr;
  const title=$('#et').value.trim()||lyr.split('\n').find(l=>l.trim()&&!/^\[.+\]$/.test(l.trim())&&!noteParse(l)&&!/^\{n[|:]/.test(l.trim()))||'Untitled';
  const art=$('#ea').value.trim(),key=$('#ek').value,tm=tmRead();
  const used=new Set([...lyr.matchAll(/^\[(.+)\]$/gm)].map(m=>m[1].toLowerCase()));
  const colors={},stops={};Object.keys(ed.colors).forEach(k=>{if(used.has(k))colors[k]=ed.colors[k]});Object.keys(ed.stops||{}).forEach(k=>{if(used.has(k))stops[k]=ed.stops[k]});
  if(ed.s){Object.assign(ed.s,{title,artist:art,lyrics:lyr,key,colors,md:Date.now()});if(Object.keys(stops).length)ed.s.stops=stops;else delete ed.s.stops;if(!ed.s.cr)ed.s.cr=crOf(ed.s);cur=ed.s}
  else{const b=ed.base;cur={id:'s'+Date.now(),title,artist:art,lyrics:lyr,key,colors,speed:b?b.speed:5,font:b?b.font:defFont(),fav:false,cr:Date.now(),md:Date.now()};songs.push(cur)}
  tmApply(cur,tm);
  if(ed.ann&&ed.ann.length)cur.ann=ed.ann;else delete cur.ann;if(ed.chords&&ed.chords.length)cur.chords=ed.chords;else delete cur.chords;if(!ed.s&&Object.keys(stops).length)cur.stops=stops;
  applyCats(cur.id,ed.cats);save();ed.dirty=false;openSong(cur)};
$('#eX').onclick=()=>{
  if(ed.dirty&&!ed.arm){ed.arm=1;$('#eX').classList.add('arm');return}
  if(ed.s)openSong(ed.s);else if(ed.tmp)openSong(ed.tmp);else{refresh();show('list')}};

