/* ===== EvoChords: one editor (file 55) =====
   The song editor page holds the chord grid: the lyrics are typed in the grid rows and the chords stay on their
   letters (EvoCore.lineedit does the edits). There is no separate lyrics text box and no separate chord screen.
   ta (the hidden text box) and ed.chords are only written when the grid is flushed (oeFlush, before Save/Exit/Notes).
   Replaces openChd, chBuild, chDone and chBack (52/13) by name; the grid keyboard (54) and chSet/chBeat* are kept. */

let oe={undo:[],ui:-1,busy:0,ed:null};

// Put the song's lyrics and chords into chs (the grid state). Keeps chords that were placed on an older text.
function oeLoad(){const lyr=ta.value;
  if(ed.chords&&ed.chords.length&&ed.chLyr!=null&&ed.chLyr!==lyr)annRemap(ed.chords,ed.chLyr.split('\n'),lyr.split('\n'));ed.chLyr=lyr;
  chs={map:{},sel:-1,cells:[],buf:'',lines:lyr.split('\n')};(ed.chords||[]).forEach(it=>{if(it&&it.n)chs.map[it.l+':'+it.c]=String(it.n)});
  chKbBuild()}

function oeStart(){if(!ed)return;oeLoad();oe={undo:[],ui:-1,busy:0,ed:null};
  // the lyrics the song came with: these lines are locked (EvoChords only adds chords, beat rows and section labels)
  oe.lyr=ed.s?songLyr(ed.s):(ed.base?songLyr(ed.base):chordOwnLyrics(ta.value));
  chBuild(null);chs.start=JSON.stringify({lines:chs.lines,chords:chNow()});$('#chl').scrollTop=0;chSelect(-1)}
function openChd(){oeStart()}

// Write the grid into the hidden text box and ed.chords. No input event: the text box is not the editor any more.
function oeFlush(){if(!chs||!ed)return;if(oe.ed)oe.ed.commit();
  const items=chNow(),lyr=EvoCore.song.padLyricsForChords(chs.lines.join('\n'),items);
  if(lyr!==ta.value||JSON.stringify(items)!==JSON.stringify(ed.chords||[])){ta.value=lyr;ed.chords=items;ed.chLyr=lyr;ed.dirty=true}}

// The notes sheet (#eN) edits the text box: take its result into the grid again.
function oeResync(){if(!chs||!ed||ta.value===ed.chLyr)return;oeLoad();chBuild(null)}

// Undo history of the grid: one entry per state (lines and chord map), at most 100.
function oeSnap(){if(oe.busy||!chs)return;const cur=JSON.stringify({lines:chs.lines,map:chs.map,key:$('#ek').value});
  if(oe.undo[oe.ui]===cur)return;oe.undo=oe.undo.slice(0,oe.ui+1);oe.undo.push(cur);if(oe.undo.length>100)oe.undo.shift();oe.ui=oe.undo.length-1}
function oeTravel(d){const n=oe.ui+d;if(!chs||n<0||n>=oe.undo.length)return;oe.ui=n;const s=JSON.parse(oe.undo[n]);
  chs.lines=s.lines;chs.map=s.map;if(s.key!=null&&$('#ek').value!==s.key){$('#ek').value=s.key;ed.dirty=true}oe.busy=1;try{chBuild(null)}finally{oe.busy=0}}

function oeRowChords(l){return chNow().filter(x=>x.l===l).map(({c,n})=>({c,n}))}
// Replace the chords of row l by res.chords (from EvoCore.lineedit).
function oeSetRow(l,res){Object.keys(chs.map).forEach(k=>{if(+k.split(':')[0]===l)delete chs.map[k]});res.chords.forEach(x=>{chs.map[l+':'+x.c]=String(x.n)})}

const OE_SECTIONS=['Intro','Verse','Pre-Chorus','Chorus','Bridge','Interlude','Outro'];
function oeSectionMenu(){const c=csh();c.append(E('h3','',L('Add a section','Tambah bagian')));
  OE_SECTIONS.forEach(n=>{const b=E('button','',n);b.onclick=()=>{ctxClose();oeAddSection(n)};c.append(b)});
  const x=E('button','',L('Cancel','Batal'));x.onclick=ctxClose;c.append(x);$('#ctx').classList.add('on')}
function oeAddSection(n){if(!chs)return;const ls=chs.lines;if(ls.length===1&&!ls[0].trim())ls.length=0;if(ls.length&&ls[ls.length-1].trim())ls.push('');
  ls.push('['+n+']');chBuild(null)}

// Build the grid from chs.lines. keep = {l,c} box to keep selected if it still exists. Every change ends in oeSnap.
function chBuild(keep=chKeepPos()){const box=$('#chtx');box.textContent='';chs.cells=[];
  const lines=chs.lines,N=EvoCore.song.gridCells({lyrics:lines.join('\n'),chords:chNow()}),map={},mask=EvoCore.layer.lyricMask(lines.join('\n'),oe.lyr||'');
  const top=E('div','chtop');top.append(chAddBtn(L('+ Beats at the start','+ Ketukan di awal'),L('Add beat row at the start','Tambah baris ketukan di awal'),()=>chInsertBeat(0)));
  box.append(top);
  lines.forEach((ln,l)=>{const tr=ln.trim();
    if(/^\[.+\]$/.test(tr)){const s=E('div','chsec');s.append(E('span','',tr.slice(1,-1)),chAddBtn(L('+ Beats','+ Ketukan'),L('Add beat row','Tambah baris ketukan'),()=>chAddBeatAfter(l)));
      if(!mask[l])s.append(chSecDelBtn(l));/* the song's own labels cannot be deleted */
      box.append(s);return}
    if(EvoCore.song.isNoteLine(ln))return;
    const beat=EvoCore.beats.isBeatLine(ln),v=EvoCore.song.visibleText(ln),row=E('div',beat?'chrow chbeat':(tr?'chrow':'chrow chempty'));
    for(let i=0;i<N;i++){const c=i*2,k=l+':'+c,cell=E('button','chc');cell.type='button';cell.dataset.i=chs.cells.length;
      const name=E('b','chn',chs.map[k]||''),t=E('span','cht',v.slice(c,c+2));
      if(c>=v.length)cell.classList.add('chx');
      cell.append(name,t);row.append(cell);chs.cells.push({l,c,el:cell,nEl:name});if(chs.map[k])map[k]=chs.map[k]}
    if(beat)row.append(chBeatCtl(l,ln));
    box.append(row)});
  chs.map=map;
  chSelect(keep?chs.cells.findIndex(x=>x.l===keep.l&&x.c===keep.c):-1);
  const add=E('div','choadd');
  add.append(chAddBtn(L('+ Section','+ Bagian'),L('Add section','Tambah bagian'),oeSectionMenu),
    chAddBtn(L('+ Beats','+ Ketukan'),L('Add beat row at the end','Tambah baris ketukan di akhir'),()=>chInsertBeat(chs.lines.length)));
  box.append(add);
  oeSnap()}

function chSecDelBtn(l){const b=E('button','chdel','×');b.type='button';b.setAttribute('aria-label',L('Delete section label','Hapus label bagian'));
  b.onclick=()=>{chDrop(l,0);chShift(l+1,-1);chs.lines.splice(l,1);chBuild(null)};return b}

// Turn lyric row l into a text field (the row's chords are kept while typing). at = caret position in the visible text.
function oeEditRow(l,at){if(!chs)return;
  if(oe.ed)oe.ed.commit();
  chSelect(-1);
  const pl=chs.lines[l];if(pl==null||EvoCore.beats.isBeatLine(pl)||/^\[.+\]$/.test(pl.trim()))return;
  const cell=chs.cells.find(x=>x.l===l);if(!cell)return;
  const row=cell.el.parentNode;
  const inp=E('input','chin');inp.type='text';inp.setAttribute('enterkeyhint','enter');inp.setAttribute('autocapitalize','off');inp.setAttribute('spellcheck','false');
  inp.placeholder=L('Type the lyrics','Ketik liriknya');
  inp.value=EvoCore.lineedit.toMarks(pl).text;
  const wrap=E('div','chedit');
  const mkBtn=(html,label,fn)=>{const b=E('button','chbtn');b.type='button';b.innerHTML=html;b.setAttribute('aria-label',label);
    b.addEventListener('pointerdown',e=>e.preventDefault());b.addEventListener('mousedown',e=>e.preventDefault());b.onclick=fn;return b};
  let done=0;
  const commit=()=>{if(done)return;done=1;if(oe.ed&&oe.ed.commit===commit)oe.ed=null;
    const res=EvoCore.lineedit.editRow(chs.lines[l],inp.value,oeRowChords(l));chs.lines[l]=res.raw;oeSetRow(l,res);chBuild(null)};
  const go=()=>{done=1;if(oe.ed&&oe.ed.commit===commit)oe.ed=null;chDrop(l,0);chShift(l+1,-1);chs.lines.splice(l,1);chBuild(null)};
  const removeRow=()=>{if(oeRowChords(l).length)ask(L('Delete this line?','Hapus baris ini?'),L('Its chords are deleted too.','Chord-nya ikut terhapus.'),L('Delete','Hapus'),go);else go()};
  wrap.append(inp,mkBtn('✓',L('Done','Selesai'),commit),mkBtn('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',L('Delete line','Hapus baris'),removeRow));
  inp.addEventListener('blur',commit);
  inp.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();if(done)return;done=1;oe.ed=null;
      const cur=EvoCore.lineedit.editRow(chs.lines[l],inp.value,oeRowChords(l));
      const[a,b]=EvoCore.lineedit.splitRow(cur.raw,inp.selectionStart,cur.chords);
      chs.lines[l]=a.raw;chShift(l+1,1);chs.lines.splice(l+1,0,b.raw);oeSetRow(l,a);oeSetRow(l+1,b);chBuild(null);oeEditRow(l+1,0);return}
    if(e.key==='Escape'){e.preventDefault();if(done)return;done=1;oe.ed=null;chBuild(null);return}
    if(e.key==='Backspace'&&inp.selectionStart===0&&inp.selectionEnd===0&&l>0){
      const p=l-1,pl2=chs.lines[p],t=pl2.trim();
      const blank=!t,sec=/^\[.+\]$/.test(t),beat=EvoCore.beats.isBeatLine(pl2),note=EvoCore.song.isNoteLine(pl2);
      if(!blank&&(sec||beat||note))return;
      e.preventDefault();if(done)return;done=1;oe.ed=null;
      const cur=EvoCore.lineedit.editRow(chs.lines[l],inp.value,oeRowChords(l));
      if(blank){chs.lines[l]=cur.raw;oeSetRow(l,cur);chDrop(p,0);chShift(p+1,-1);chs.lines.splice(p,1);chBuild(null);oeEditRow(p,0);return}
      const j=EvoCore.lineedit.joinRows(pl2,oeRowChords(p),cur.raw,cur.chords);
      chs.lines[p]=j.raw;oeSetRow(p,j);chDrop(l,0);chShift(l+1,-1);chs.lines.splice(l,1);chBuild(null);oeEditRow(p,j.at);return}
  });
  row.replaceWith(wrap);
  oe.ed={commit};
  inp.focus();try{const q=Math.max(0,Math.min(at||0,inp.value.length));inp.setSelectionRange(q,q)}catch(e){}
  try{wrap.scrollIntoView({block:'center'})}catch(e){}}

// Every tap on a box (letters or chord part) selects that box for a chord. The lyric text is never typed here:
// tapping the letters does not open a text field (EvoLyric owns the lyrics).
$('#chtx').addEventListener('click',e=>{
  const cell=e.target.closest&&e.target.closest('.chc');if(!cell||!chs)return;
  chSelect(+cell.dataset.i)},true);

function chDone(){oeFlush();chSelect(-1)}
function chBack(){chSelect(-1)}

(function(){
  const edit=$('#edit');edit.classList.add('one');
  const anchor=edit.querySelector('.ed'),chl=$('#chl'),chkb=$('#chkb');
  anchor.after(chl);chl.after(chkb);
  $('#ek').querySelectorAll('option').forEach(o=>{if(o.value==='__chord'||o.value==='__sep')o.remove()});
  openEdit=(function(orig){return function(...a){orig.apply(this,a);oeStart()}})(openEdit);
  chSet=(function(orig){return function(n){orig.apply(this,arguments);oeSnap()}})(chSet);
  $('#eU').addEventListener('click',e=>{e.stopImmediatePropagation();oeTravel(-1)},true);
  $('#eR').addEventListener('click',e=>{e.stopImmediatePropagation();oeTravel(1)},true);
  ['#eS','#eX','#eN'].forEach(s=>$(s).addEventListener('click',oeFlush,true));
  document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#notebox,#arr'))setTimeout(oeResync,0)},true);
})();

/* The text-box tools have no place here: the Section side panel and its toggle are hidden (55-one-editor.css).
   The tour shows the grid instead of the text box and skips Auto Section and the side panel. */
(function(){const i=TOUR.findIndex(s=>s.t==='#ta');if(i<0)return;
  TOUR[i]={...TOUR[i],t:'#chtx',p:r=>[r.left+r.width*.3,r.top+Math.min(r.height*.3,140)],
    d:['Lyrics come from EvoLyric and stay as they are; here you write the chords: tap a box above a word. We use a demo song; it is not saved.',
       'Lirik datang dari EvoLyric dan tidak diubah; di sini kamu menulis chord: ketuk kotak di atas kata. Kita pakai lagu contoh; lagu ini tidak disimpan.'],
    go:()=>{if(!$('#edit').classList.contains('on')||!tour.ed){openEdit(null,autoSec(TOUR_LY)||TOUR_LY,TOUR_T);$('#ea').value=TOUR_A;tour.ed=1}}};
  /* same number of steps (07-tour.js counts them): the Auto Section and side panel steps show the chord boxes and the add buttons */
  const a=TOUR.findIndex(s=>s.t==='#eA');if(a>=0)TOUR[a]={t:'#chtx .chrow',g:'tap',h:['Chords','Chord'],
    d:['Tap a box above the words to write a chord. The first keyboard row has the chords of the song key.','Ketuk kotak di atas kata untuk menulis chord. Baris pertama keyboard berisi chord dari nada dasar lagu.']};
  const b=TOUR.findIndex(s=>s.t==='#side');if(b>=0)TOUR[b]={t:'#chtx .chsec .chadd',g:'tap',h:['Beats and sections','Ketukan dan bagian'],
    d:['+ Beats adds a beat row for an intro or interlude. At the bottom: + Section and + Beats.','+ Ketukan menambah baris ketukan untuk intro atau interlude. Di paling bawah: + Bagian dan + Ketukan.']};
  const q=TOUR.find(s=>s.t==='#q');if(q){q.h=['Chords from the internet','Chord dari internet'];
    q.d=['Type a title in the search box. Not in your Library? Tap Search online: Google shows Chordtela pages; copy the link, come back and tap Get chords.',
         'Ketik judul di kolom cari. Tidak ada di Library? Ketuk Cari di internet: Google menampilkan halaman Chordtela; salin link-nya, kembali, lalu ketuk Ambil chord.']}})();
