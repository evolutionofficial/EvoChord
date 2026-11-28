/* ===== EvoChord: chord editor (files 50+ replace EvoLyric's chord screen, 13-notes-chords.js) =====
   Every lyric row and beat row has the same number of 2-character boxes (EvoCore.song.gridCells).
   Beat rows ("|• · • ·|") get bar/time-signature/delete controls; "+ Beats" buttons add beat rows.
   chKbBuild, chAdd, chCan, chVis, CH_TOK and CH_ROWS are still EvoLyric's. */

function chKeepPos(){const p=chs&&chs.sel>=0&&chs.cells[chs.sel];return p?{l:p.l,c:p.c}:null}

// Remove chords of row l from cell fromCell on.
function chDrop(l,fromCell){for(const k of Object.keys(chs.map)){const p=k.split(':').map(Number);if(p[0]===l&&p[1]>=fromCell)delete chs.map[k]}}

// Move chord keys of rows >= from by delta.
function chShift(from,delta){const e=Object.entries(chs.map);chs.map={};for(const[k,n]of e){const p=k.split(':').map(Number);chs.map[(p[0]>=from?p[0]+delta:p[0])+':'+p[1]]=n}}

function chAddBtn(text,aria,fn){const b=E('button','chadd',text);b.type='button';b.setAttribute('aria-label',aria);b.onclick=fn;return b}

function openChd(){if(!ed)return;const lyr=ta.value;
  if(ed.chords&&ed.chords.length&&ed.chLyr!=null&&ed.chLyr!==lyr)annRemap(ed.chords,ed.chLyr.split('\n'),lyr.split('\n'));ed.chLyr=lyr;
  chs={map:{},sel:-1,cells:[],buf:'',lines:lyr.split('\n')};(ed.chords||[]).forEach(it=>{if(it&&it.n)chs.map[it.l+':'+it.c]=String(it.n)});
  chKbBuild();chBuild();chs.start=JSON.stringify({lines:chs.lines,chords:chNow()});show('chd');$('#chl').scrollTop=0;chSelect(-1)}

// Build the grid from chs.lines. keep = {l,c} box to keep selected if it still exists.
function chBuild(keep=chKeepPos()){const box=$('#chtx');box.textContent='';chs.cells=[];
  const lines=chs.lines,N=EvoCore.song.gridCells({lyrics:lines.join('\n'),chords:chNow()}),map={};
  const top=E('div','chtop');top.append(chAddBtn(L('+ Beats at the start','+ Ketukan di awal'),L('Add beat row at the start','Tambah baris ketukan di awal'),()=>chInsertBeat(0)));
  box.append(top);
  lines.forEach((ln,l)=>{const tr=ln.trim();
    if(!tr){box.append(E('div','chgap'));return}
    if(/^\[.+\]$/.test(tr)){const s=E('div','chsec');s.append(E('span','',tr.slice(1,-1)),chAddBtn(L('+ Beats','+ Ketukan'),L('Add beat row','Tambah baris ketukan'),()=>chAddBeatAfter(l)));box.append(s);return}
    if(EvoCore.song.isNoteLine(ln))return;
    const beat=EvoCore.beats.isBeatLine(ln),v=EvoCore.song.visibleText(ln),row=E('div',beat?'chrow chbeat':'chrow');
    for(let i=0;i<N;i++){const c=i*2,k=l+':'+c,cell=E('button','chc');cell.type='button';cell.dataset.i=chs.cells.length;
      const name=E('b','chn',chs.map[k]||''),t=E('span','cht',v.slice(c,c+2));
      if(c>=v.length)cell.classList.add('chx');
      cell.append(name,t);row.append(cell);chs.cells.push({l,c,el:cell,nEl:name});if(chs.map[k])map[k]=chs.map[k]}
    if(beat)row.append(chBeatCtl(l,ln));
    box.append(row)});
  chs.map=map;
  chSelect(keep?chs.cells.findIndex(x=>x.l===keep.l&&x.c===keep.c):-1)}

function chBeatCtl(l,ln){const ctl=E('div','chbctl');
  const sel=E('select','chtsig');sel.setAttribute('aria-label',L('Time signature','Birama'));
  const sig=EvoCore.beats.readBeatLine(ln).timeSig;
  EvoCore.beats.TIME_SIGS.forEach(t=>{const o=E('option','',t);o.value=t;if(t===sig)o.selected=true;sel.append(o)});
  sel.onchange=()=>chBeatSig(l,sel.value);
  const mk=(html,label,fn)=>{const b=E('button','chbtn');b.type='button';b.innerHTML=html;b.setAttribute('aria-label',label);b.onclick=fn;return b};
  ctl.append(sel,
    mk('&minus;',L('Remove bar','Kurangi birama'),()=>chBeatResize(l,-1)),
    mk('+',L('Add bar','Tambah birama'),()=>chBeatResize(l,1)),
    mk('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',L('Delete beat row','Hapus baris ketukan'),()=>chBeatDel(l)));
  return ctl}

function chBeatSig(l,sig){chs.lines[l]=EvoCore.beats.makeBeatLine(EvoCore.beats.readBeatLine(chs.lines[l]).bars,sig);chDrop(l,EvoCore.song.visibleText(chs.lines[l]).length);chBuild()}
function chBeatResize(l,d){chs.lines[l]=EvoCore.beats.resizeBeatLine(chs.lines[l],d);chDrop(l,EvoCore.song.visibleText(chs.lines[l]).length);chBuild()}

function chBeatDel(l){
  const go=()=>{const p=chKeepPos(),keep=p&&p.l===l?null:p&&p.l>l?{l:p.l-1,c:p.c}:p;
    chDrop(l,0);chShift(l+1,-1);chs.lines.splice(l,1);chBuild(keep)};
  if(chNow().some(x=>x.l===l))ask(L('Delete this beat row?','Hapus baris ketukan ini?'),'',L('Delete','Hapus'),go);else go()}

function chInsertBeat(k){const p=chKeepPos(),keep=p&&p.l>=k?{l:p.l+1,c:p.c}:p;
  chShift(k,1);chs.lines.splice(k,0,EvoCore.beats.makeBeatLine(1,(cur&&cur.timeSig)||'4/4'));
  chBuild(keep);chSelect(chs.cells.findIndex(x=>x.l===k&&x.c===0))}

// A new beat row goes after the section line and any beat rows that already follow it.
function chAddBeatAfter(l){let k=l+1;while(k<chs.lines.length&&EvoCore.beats.isBeatLine(chs.lines[k]))k++;chInsertBeat(k)}

function chNow(){return Object.keys(chs.map).map(k=>{const p=k.split(':');return{l:+p[0],c:+p[1],n:chs.map[k]}}).sort((a,b)=>a.l-b.l||a.c-b.c)}

function chSelect(i){if(!chs)return;chs.cells.forEach(x=>x.el.classList.remove('on'));const k=$('#chkb');
  if(i<0||i>=chs.cells.length){chs.sel=-1;k.hidden=true;return}
  chs.sel=i;const x=chs.cells[i];x.el.classList.add('on');k.hidden=false;chs.buf=chs.map[x.l+':'+x.c]||'';chKbState();
  try{x.el.scrollIntoView({block:'nearest'})}catch(e){}}

function chSet(n){const x=chs&&chs.cells[chs.sel];if(!x)return;const k=x.l+':'+x.c;if(n)chs.map[k]=n;else delete chs.map[k];x.nEl.textContent=n||'';chs.buf=n||'';chKbState()}

function chKbState(){const k=$('#chkb');if(!chs)return;k.querySelector('.chcur').textContent=chs.buf||'–';
  k.querySelectorAll('[data-k]').forEach(b=>{b.disabled=!chCan(chs.buf,b.dataset.k)});
  let fr=k.querySelector('.chfam');if(!fr){fr=E('div','chfam');k.querySelector('.chrec').before(fr)}
  const kv=$('#ek').value,key=(kv==='__sep'||kv==='__chord')?'':kv,fam=EvoCore.chord.chordFamily(key);
  fr.textContent='';fr.hidden=!fam.length;
  if(fam.length){fr.append(E('span','chfl',EvoCore.chord.normKey(key)));
    fam.forEach(n=>{const b=E('button','',n);b.type='button';b.dataset.r=n;b.setAttribute('aria-label',L('Chord ','Chord ')+n);if(n===chs.buf)b.classList.add('on');fr.append(b)})}
  const r=k.querySelector('.chrec');r.textContent='';const seen=[];chNow().forEach(it=>{if(!seen.includes(it.n)&&!fam.includes(it.n))seen.push(it.n)});
  seen.slice(0,10).forEach(n=>{const b=E('button','',n);b.type='button';b.dataset.r=n;r.append(b)})}

function chDone(){if(!chs)return;const items=chNow();
  if(JSON.stringify({lines:chs.lines,chords:items})!==chs.start){
    const lyr=EvoCore.song.padLyricsForChords(chs.lines.join('\n'),items);
    ta.value=lyr;ta.dispatchEvent(new Event('input'));
    ed.chords=items;ed.chLyr=ta.value;ed.dirty=true}
  chs=null;show('edit')}

function chBack(){if(!chs){show('edit');return}if(JSON.stringify({lines:chs.lines,chords:chNow()})===chs.start){chs=null;show('edit');return}
  ask(L('Discard chords?','Buang chord?'),L('Your chord changes on this page will be lost.','Perubahan chord di halaman ini akan hilang.'),L('Discard','Buang'),()=>{chs=null;show('edit')})}

// Toolbar button for chords next to the notes button (opens the chord screen).
(function(){const n=$('#eN');if(!n||$('#eCho'))return;
  const b=document.createElement('button');b.id='eCho';b.type='button';
  b.setAttribute('aria-label',L('Chords','Chord'));b.title=L('Chords','Chord');
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  b.onclick=()=>openChd();n.after(b)})();
