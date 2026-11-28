/* ===== EvoChord: one editor (file 55): the song editor page holds the chord grid; the lyrics are locked (EvoLyric owns them) ===== */
module.exports=({test,assert,eq,open})=>{
const prep=async p=>{await p.evaluate(()=>{songs[0].lyrics='[Verse]\npagi datang perlahan\nsampai pagi tiba';songs[0].chords=[{l:1,c:0,n:'C'},{l:1,c:6,n:'G'},{l:1,c:12,n:'Am'},{l:2,c:0,n:'F'}];save()})};
const openSong=async p=>{await p.evaluate(()=>openEdit(songs[0]));await p.waitForTimeout(400)};
// Tap the letters (bottom part) of the box at line l, visible column c.
const tapLetters=async(p,l,c)=>{const i=await p.evaluate(([l,c])=>chs.cells.findIndex(x=>x.l===l&&x.c===c),[l,c]);await p.click('#chtx .chc >> nth='+i+' >> span.cht');await p.waitForTimeout(150)};
// Tap a key on the chord keyboard.
const key=async(p,k)=>{await p.click('#chkb [data-k="'+k+'"]');await p.waitForTimeout(120)};

test('One editor: Edit shows the chord grid; the lyrics cannot be typed',async()=>{
  const t=await open(),p=t.page;await prep(p);await openSong(p);
  eq(await p.evaluate(()=>[$('#edit').classList.contains('on'),$('#edit').classList.contains('one')]),[true,true],'edit page is the one editor');
  eq(await p.evaluate(()=>document.querySelectorAll('#chtx .chrow').length>0),true,'grid rows');
  eq(await p.evaluate(()=>$('#ta').offsetParent!==null),false,'text box not visible');
  eq(await p.evaluate(()=>$('#et').value),'Pulang ke Panggung','title shown');
  await tapLetters(p,1,6);
  eq(await p.evaluate(()=>!!document.querySelector('.chin')),false,'tapping the letters opens no text field');
  eq(await p.evaluate(()=>!$('#chkb').hidden),true,'chord keyboard open');
  eq(await p.evaluate(()=>{const s=chs.cells[chs.sel];return[s.l,s.c,document.querySelectorAll('#chtx .chc.on').length]}),[1,6,1],'that box is selected');
  eq(await p.evaluate(()=>[...document.querySelectorAll('button')].some(b=>/Lyric line|Baris lirik/.test(b.textContent))),false,'no + Lyric line button');
  eq(t.errors,[],'no page errors');await t.close()});

test('One editor: + Section adds a label that can be deleted; the song\'s own labels cannot',async()=>{
  const t=await open(),p=t.page;await prep(p);await openSong(p);
  const hasDel=name=>p.evaluate(n=>[...document.querySelectorAll('#chtx .chsec')].filter(s=>s.querySelector('span').textContent===n).map(s=>!!s.querySelector('.chdel')),name);
  eq(await hasDel('Verse'),[false],'[Verse] has no delete button');
  await p.click('#chtx .choadd button:text-is("+ Section")');await p.waitForTimeout(200);
  await p.click('#csheet button:text-is("Outro")');await p.waitForTimeout(200);
  eq(await p.evaluate(()=>chs.lines.slice(-2)),['','[Outro]'],'Outro appended, no lyric line after it');
  eq(await hasDel('Outro'),[true],'[Outro] has a delete button');
  await p.click('#chtx .chsec:has(span:text-is("Outro")) .chdel');await p.waitForTimeout(200);
  eq(await p.evaluate(()=>chs.lines.some(l=>l.trim()==='[Outro]')),false,'Outro deleted');
  eq(t.errors,[],'no page errors');await t.close()});

test('One editor: saving never changes the lyrics',async()=>{
  const t=await open(),p=t.page;await prep(p);await openSong(p);
  await p.click('#chtx .choadd button:text-is("+ Beats")');await p.waitForTimeout(200);
  await key(p,'G');
  await p.click('#eS');await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{const o=evoSongOut(songs.find(s=>s.id===songs[0].id));return{lyrics:o.lyrics,beatG:o.rows.some(x=>EvoCore.beats.isBeatLine(x.text)&&x.ch.some(c=>c.n==='G'))}});
  eq(r.lyrics,'[Verse]\npagi datang perlahan\nsampai pagi tiba','lyrics unchanged');
  eq(r.beatG,true,'beat row with its G chord kept as a row');
  eq(t.errors,[],'no page errors');await t.close()});

test('One editor: undo restores a deleted beat row',async()=>{
  const t=await open(),p=t.page;await prep(p);await openSong(p);
  await p.click('#chtx .choadd button:text-is("+ Beats")');await p.waitForTimeout(200);
  await key(p,'G');
  await p.click('#chtx .chbctl .chbtn[aria-label="Delete beat row"]');await p.waitForTimeout(200);
  eq(await p.evaluate(()=>$('#ctx').classList.contains('on')),true,'asks first (row has a chord)');
  await p.click('#ctx button.del');await p.waitForTimeout(150);
  eq(await p.evaluate(()=>chs.lines.length),3,'beat row deleted');
  await p.click('#eU');await p.waitForTimeout(150);
  eq(await p.evaluate(()=>[chs.lines.length,EvoCore.beats.isBeatLine(chs.lines[3]),chNow().some(x=>x.l===3&&x.n==='G')]),[4,true,true],'beat row and its G are back');
  eq(t.errors,[],'no page errors');await t.close()});

test('One editor: Get chords from Chordtela puts the chords on the song\'s own lyrics',async()=>{
  const t=await open(),p=t.page;
  let hits=0;
  await t.ctx.route('**/api/chordtela**',r=>{hits++;return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({title:'X',artist:'Y',key:'C',capo:0,lyrics:'[Intro]\n|• · • · • · • ·|\n\n[Verse]\npagi datang perlahan\nsampai pagi tiba',chords:[{l:1,c:0,n:'G'},{l:4,c:0,n:'C'},{l:5,c:6,n:'F'}],versions:[],main:0})})});
  await p.evaluate(()=>{songs[0].lyrics='[Verse]\npagi datang perlahan\nsampai pagi tiba';songs[0].chords=[];save()});
  await openSong(p);
  await p.evaluate(()=>{chordInto=true;chordIn('https://www.chordtela.com/2026/01/x.html','x')});
  await p.waitForTimeout(800);
  eq(hits,1,'asked the EvoChord server once');
  eq(await p.evaluate(()=>chs.lines.slice(0,5)),['[Intro]','|• · • · • · • ·|','[Verse]','pagi datang perlahan','sampai pagi tiba'],'intro added, lyrics unchanged');
  eq(await p.evaluate(()=>chNow().map(x=>x.l+':'+x.n)),['1:G','3:C','4:F'],'chords on their lines');
  eq(await p.evaluate(()=>chordInto),false,'import flag reset');
  eq(t.errors,[],'no page errors');await t.close()});
test('One editor: a new song made here has no lyrics of its own; its sections stay EvoChord lines',async()=>{
  const t=await open(),p=t.page;
  await p.evaluate(()=>openEdit(null));await p.waitForTimeout(300);await p.fill('#et','Instrumental');
  await p.click('#chtx .choadd button >> nth=0');await p.waitForTimeout(200);await p.click('#csheet button:text-is("Intro")');await p.waitForTimeout(200);
  await p.click('#eS');await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{const s=songs.find(x=>x.title==='Instrumental');const o=evoSongOut(s);return[s.lyr,o.lyrics,o.rows.map(x=>x.text)]});
  eq(r,['','',['[Intro]']],'no lyrics; the label is a row');
  eq(t.errors,[],'no page errors');await t.close()});
};
