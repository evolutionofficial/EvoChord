/* ===== EvoChords: one editor (file 55): the song editor page holds the chord grid, no separate lyrics text box ===== */
module.exports=({test,assert,eq,open})=>{
const prep=async p=>{await p.evaluate(()=>{songs[0].lyrics='[Verse]\npagi datang perlahan\nsampai pagi tiba';songs[0].chords=[{l:1,c:0,n:'C'},{l:1,c:6,n:'G'},{l:1,c:12,n:'Am'},{l:2,c:0,n:'F'}];save()})};
const openSong=async p=>{await p.evaluate(()=>openEdit(songs[0]));await p.waitForTimeout(400)};
// Tap the letters (bottom part) of the box at line l, visible column c.
const tapLetters=async(p,l,c)=>{const i=await p.evaluate(([l,c])=>chs.cells.findIndex(x=>x.l===l&&x.c===c),[l,c]);await p.click('#chtx .chc >> nth='+i+' >> span.cht');await p.waitForTimeout(150)};

test('One editor: Edit shows the chord grid with title and key; no text box',async()=>{
  const t=await open(),p=t.page;await prep(p);await openSong(p);
  eq(await p.evaluate(()=>[$('#edit').classList.contains('on'),$('#edit').classList.contains('one')]),[true,true],'edit page is the one editor');
  eq(await p.evaluate(()=>document.querySelectorAll('#chtx .chrow').length>0),true,'grid rows');
  eq(await p.evaluate(()=>$('#ta').offsetParent!==null),false,'text box not visible');
  eq(await p.evaluate(()=>$('#chd').classList.contains('on')),false,'chord screen not shown');
  eq(await p.evaluate(()=>[...$('#ek').options].some(o=>o.value==='__chord')),false,'no chord option in the key list');
  eq(await p.evaluate(()=>$('#et').value),'Pulang ke Panggung','title shown');
  eq(t.errors,[],'no page errors');await t.close()});

test('One editor: deleting a word deletes its chord',async()=>{
  const t=await open(),p=t.page;await prep(p);await openSong(p);
  await tapLetters(p,1,6);
  assert(await p.evaluate(()=>!!document.querySelector('.chin')),'text field open on row 1');
  eq(await p.evaluate(()=>document.querySelector('.chin').value),'pagi datang perlahan','row text in the field');
  await p.fill('.chin','pagi perlahan');
  await p.click('.chedit .chbtn >> nth=0');await p.waitForTimeout(150);
  eq(await p.evaluate(()=>chNow()),[{l:1,c:0,n:'C'},{l:1,c:4,n:'Am'},{l:2,c:0,n:'F'}],'G removed with its word, Am follows its letters');
  await p.click('#eS');await p.waitForTimeout(400);
  eq(await p.evaluate(()=>songs[0].lyrics.includes('pagi perlahan')),true,'saved lyrics');
  eq(await p.evaluate(()=>songs[0].chords.some(c=>c.n==='G')),false,'saved chords have no G');
  eq(t.errors,[],'no page errors');await t.close()});

test('One editor: Enter splits a line, Backspace at the start joins it back',async()=>{
  const t=await open(),p=t.page;await prep(p);await openSong(p);
  await tapLetters(p,1,6);
  await p.evaluate(()=>{const i=$('.chin');i.setSelectionRange(12,12)});
  await p.keyboard.press('Enter');await p.waitForTimeout(150);
  eq(await p.evaluate(()=>[chs.lines[1],chs.lines[2]]),['pagi datang','perlahan'],'split into two rows');
  eq(await p.evaluate(()=>chNow()),[{l:1,c:0,n:'C'},{l:1,c:6,n:'G'},{l:2,c:0,n:'Am'},{l:3,c:0,n:'F'}],'Am moved to the new row, F moved down, G stays before the caret');
  await p.evaluate(()=>{const i=$('.chin');i.setSelectionRange(0,0)});
  await p.keyboard.press('Backspace');await p.waitForTimeout(150);
  eq(await p.evaluate(()=>chs.lines[1]),'pagi datang perlahan','joined back');
  eq(await p.evaluate(()=>chNow().filter(x=>x.l===1).map(x=>x.n)),['C','G','Am'],'Am back on row 1');
  eq(t.errors,[],'no page errors');await t.close()});

test('One editor: undo restores a deleted line',async()=>{
  const t=await open(),p=t.page;await prep(p);await openSong(p);
  await tapLetters(p,2,0);
  await p.click('.chedit .chbtn >> nth=1');await p.waitForTimeout(150);
  eq(await p.evaluate(()=>$('#ctx').classList.contains('on')),true,'asks first (row has a chord)');
  await p.click('#ctx button.del');await p.waitForTimeout(150);
  eq(await p.evaluate(()=>chs.lines.length),2,'row deleted');
  await p.click('#eU');await p.waitForTimeout(150);
  eq(await p.evaluate(()=>[chs.lines.length,chs.lines[2],chNow().some(x=>x.l===2&&x.n==='F')]),[3,'sampai pagi tiba',true],'line and its F chord are back');
  eq(t.errors,[],'no page errors');await t.close()});

test('One editor: a new song starts empty; + Lyric line adds a row to type in',async()=>{
  const t=await open(),p=t.page;
  await p.evaluate(()=>openEdit(null));await p.waitForTimeout(400);
  await p.click('.choadd button:has-text("+ Lyric line")');await p.waitForTimeout(150);
  assert(await p.evaluate(()=>!!document.querySelector('.chin')),'text field open on the new row');
  await p.fill('.chin','halo');
  await p.click('.chedit .chbtn >> nth=0');await p.waitForTimeout(150);
  await p.fill('#et','Baru');
  await p.click('#eS');await p.waitForTimeout(400);
  eq(await p.evaluate(()=>{const s=songs.find(x=>x.title==='Baru');return s?s.lyrics.trim():null}),'halo','new song saved with the typed lyric');
  eq(t.errors,[],'no page errors');await t.close()});
};
