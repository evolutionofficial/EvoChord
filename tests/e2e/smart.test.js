/* ===== EvoChords: smart editing (file 59): Per section, "different" chords, moving chords, one undo step per hold ===== */
module.exports=({test,assert,eq,open})=>{
const LYR='[Verse 1]\npagi datang\nsampai pagi tiba\n\n[Chorus]\nkita bernyanyi\n\n[Verse 2]\nmalam datang\nbulan bersinar\n\n[Chorus]\nkita bernyanyi';
const prep=async(p,chords=[],linked)=>{await p.evaluate(([lyr,ch,lk])=>{songs[0].lyrics=lyr;songs[0].chords=ch;songs[0].key='C';save();
    if(lk!=null)localStorage.setItem('evo.linkSections',lk)},[LYR,chords,linked==null?null:linked])};
const openSong=async p=>{await p.evaluate(()=>openEdit(songs[0]));await p.waitForTimeout(400)};
// Select the box at line l, visible column c (tap its chord part).
const selectBox=async(p,l,c)=>{const i=await p.evaluate(([l,c])=>chs.cells.findIndex(x=>x.l===l&&x.c===c),[l,c]);await p.click('#chtx .chc >> nth='+i+' >> .chn');await p.waitForTimeout(120)};
// Tap a key on the chord keyboard.
const key=async(p,k)=>{await p.click('#chkb [data-k="'+k+'"]');await p.waitForTimeout(120)};
const clear=async p=>{await p.click('#chkb [data-a="clr"]');await p.waitForTimeout(120)};
const chordAt=(p,l,c)=>p.evaluate(([l,c])=>{const x=chNow().find(y=>y.l===l&&y.c===c);return x?x.n:null},[l,c]);
const markAt=(p,l,c)=>p.evaluate(([l,c])=>{const x=chs.cells.find(y=>y.l===l&&y.c===c);return !!x&&x.nEl.classList.contains('ov')},[l,c]);
const toggleLink=async p=>{await p.click('#eLk');await p.waitForTimeout(120)};

test('Smart: with Per section on, a chord in one Chorus appears in every Chorus',async()=>{
  const t=await open(),p=t.page;await prep(p,[],'1');await openSong(p);
  eq(await p.evaluate(()=>document.querySelector('#eLk').getAttribute('aria-pressed')),'true','Per section is on by default');
  await selectBox(p,5,0);await key(p,'G');
  eq(await p.evaluate(()=>chNow().filter(x=>x.n==='G').map(x=>x.l+':'+x.c)),[5,12].map(l=>l+':0'),'G on both Chorus rows');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: with it off, the edited chord is marked different and is not overwritten later',async()=>{
  const t=await open(),p=t.page;await prep(p,[],'1');await openSong(p);
  await selectBox(p,1,0);await key(p,'C');
  eq(await chordAt(p,8,0),'C','C linked to Verse 2');
  await toggleLink(p);
  eq(await p.evaluate(()=>document.querySelector('#eLk').getAttribute('aria-pressed')),'false','switch is off');
  await selectBox(p,8,0);await clear(p);await key(p,'A');await key(p,'m');
  eq(await chordAt(p,8,0),'Am','Am on Verse 2');
  eq(await markAt(p,8,0),true,'the different chord is marked');
  await toggleLink(p);
  await selectBox(p,1,0);await clear(p);await key(p,'D');
  eq(await chordAt(p,1,0),'D','D on Verse 1');
  eq(await chordAt(p,8,0),'Am','Verse 2 keeps its different Am');
  await selectBox(p,8,0);
  eq(await p.evaluate(()=>!$('#chkb .chfollow').hidden),true,'Follow again shown for a different chord');
  await p.click('#chkb .chfollow');await p.waitForTimeout(150);
  eq(await chordAt(p,8,0),'D','Follow again: Verse 2 is D');
  eq(await markAt(p,8,0),false,'no mark after Follow again');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: moving a chord stops in front of another; the name stays whole',async()=>{
  const t=await open(),p=t.page;
  await prep(p,[{l:1,c:0,n:'D/F#'},{l:1,c:6,n:'C#m7b5'}],'1');await openSong(p);
  await selectBox(p,1,0);
  for(let i=0;i<3;i++){await p.click('#chkb [data-mv="1"]');await p.waitForTimeout(120)}
  eq(await chordAt(p,1,4),'D/F#','D/F# stopped in front of C#m7b5 (box 4)');
  eq(await chordAt(p,1,6),'C#m7b5','C#m7b5 did not move');
  eq(await p.evaluate(()=>chNow().map(x=>x.n)),['D/F#','C#m7b5'],'names unchanged');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: one undo step undoes a hold',async()=>{
  const t=await open(),p=t.page;
  await prep(p,[{l:1,c:0,n:'D'}],'1');await openSong(p);
  await selectBox(p,1,0);
  await p.dispatchEvent('#chkb [data-mv="1"]','pointerdown');
  await p.waitForTimeout(900);
  await p.evaluate(()=>document.dispatchEvent(new Event('pointerup')));
  await p.waitForTimeout(150);
  const moved=await p.evaluate(()=>chNow().find(x=>x.n==='D').c);
  assert(moved>2,'held: the chord moved more than one box (now at '+moved+')');
  await p.click('#eU');await p.waitForTimeout(150);
  eq(await chordAt(p,1,0),'D','one undo brings the chord back to its start');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: save keeps the marks',async()=>{
  const t=await open(),p=t.page;await prep(p,[],'1');await openSong(p);
  await selectBox(p,1,0);await key(p,'C');
  await toggleLink(p);
  await selectBox(p,8,0);await clear(p);await key(p,'A');await key(p,'m');
  await p.click('#eS');await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{const s=songs.find(x=>x.id===songs[0].id);const o=evoSongOut(s);
    return{marked:(o.chords||[]).filter(c=>c.o===1).map(c=>c.l+':'+c.c),stored:(s.chords||[]).filter(c=>c.o===1).length}});
  assert(r.marked.includes('8:0')||r.stored>0,'a chord with o:1 is saved ('+JSON.stringify(r)+')');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: holding a chord shows its variants',async()=>{
  const t=await open(),p=t.page;await prep(p,[],'1');await openSong(p);
  await p.evaluate(()=>{$('#ek').value='G'});
  await selectBox(p,1,0);
  await p.dispatchEvent('#chkb .chfam button[data-r="D"]','pointerdown');
  await p.waitForTimeout(600);
  await p.evaluate(()=>document.dispatchEvent(new Event('pointerup')));
  await p.waitForTimeout(100);
  eq(await p.locator('.chvar').isVisible(),true,'the variants are shown');
  const names=await p.evaluate(()=>[...document.querySelectorAll('.chvar button')].map(b=>b.textContent));
  assert(names.includes('D/F#')&&names.includes('Dsus4'),'variants of D: '+names.join(' '));
  await p.evaluate(()=>document.querySelector('#chkb .chfam button[data-r="D"]').click());
  await p.waitForTimeout(100);
  eq(await chordAt(p,1,0),null,'the click after the long press did not write D');
  await p.click('.chvar button[data-v="D/F#"]');await p.waitForTimeout(120);
  eq(await chordAt(p,1,0),'D/F#','D/F# is written to box (1,0)');
  eq(await p.locator('.chvar').count(),0,'the popover closes after a tap');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: a progression fills the section',async()=>{
  const t=await open(),p=t.page;await prep(p,[],'1');await openSong(p);
  await selectBox(p,5,0);
  await p.click('#ePt');await p.waitForTimeout(150);
  await p.fill('#csheet .smin','G - D - Em - C');
  await p.click('#csheet [data-pl="2"]');
  await p.click('#csheet .ok');await p.waitForTimeout(150);
  const on=l=>p.evaluate(l=>chNow().filter(x=>x.l===l).map(x=>x.c+':'+x.n),l);
  const r5=await on(5);
  eq(r5[0],'0:G','G at the start of the line');
  const[c1,n1]=r5[1].split(':');
  assert(n1==='D'&&+c1>0&&+c1%2===0,'D at an even box after it: '+JSON.stringify(r5));
  eq(await on(12),r5,'the second Chorus has the same chords (Per section on)');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: changing a chord offers to change every one like it',async()=>{
  const t=await open(),p=t.page;await prep(p,[],'0');await openSong(p);
  for(const[l,c]of[[1,0],[2,0],[8,0]]){await selectBox(p,l,c);await key(p,'C')}
  await selectBox(p,1,0);await clear(p);await key(p,'G');
  await selectBox(p,2,0);
  eq(await p.locator('.chrall').isVisible(),true,'the Change bar shows');
  await p.click('.chrall button.ok');await p.waitForTimeout(120);
  eq([await chordAt(p,1,0),await chordAt(p,2,0),await chordAt(p,8,0)],['G','G','G'],'all three are G');
  await p.click('#eU');await p.waitForTimeout(150);
  eq([await chordAt(p,1,0),await chordAt(p,2,0),await chordAt(p,8,0)],['G','C','C'],'one undo takes back the whole Change (the G typed in the first box stays)');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: transpose the whole song in the editor (+2) changes chords and key; undo brings all back in one step',async()=>{
  const t=await open(),p=t.page;await prep(p,[{l:1,c:0,n:'D/F#'},{l:2,c:0,n:'C#m7b5'}],'1');
  await p.evaluate(()=>{songs[0].key='D';save()});await openSong(p); // the song is in D (picking D in the editor would move the chords: the key is the anchor)
  await p.click('#eTp');await p.waitForTimeout(150);
  await p.click('#csheet [data-tp="1"]');await p.click('#csheet [data-tp="1"]');
  await p.click('#csheet .ok');await p.waitForTimeout(120);
  eq(await chordAt(p,1,0),'E/G#','D/F# +2 is E/G#');
  eq(await chordAt(p,2,0),'D#m7b5','C#m7b5 +2 is D#m7b5');
  eq(await p.evaluate(()=>EvoCore.chord.normKey($('#ek').value)),'E','the key is E');
  await p.click('#eU');await p.waitForTimeout(150);
  eq(await chordAt(p,1,0),'D/F#','one undo: D/F#');
  eq(await chordAt(p,2,0),'C#m7b5','one undo: C#m7b5');
  eq(await p.evaluate(()=>$('#ek').value),'D','one undo: the key is D again');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: +2 then −2 gives the exact original names',async()=>{
  const t=await open(),p=t.page;await prep(p,[{l:1,c:0,n:'A#'},{l:1,c:6,n:'F/A'}],'1');await openSong(p);
  await p.evaluate(()=>{$('#ek').value='F'});
  const run=async(v,times)=>{await p.click('#eTp');await p.waitForTimeout(120);
    for(let i=0;i<times;i++)await p.click('#csheet [data-tp="'+v+'"]');
    await p.click('#csheet .ok');await p.waitForTimeout(120)};
  await run('1',2);
  await run('-1',2);
  eq(await chordAt(p,1,0),'A#','A# is back to A# (not Bb)');
  eq(await chordAt(p,1,6),'F/A','F/A is back to F/A');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: transpose a section with Per section on skips chords marked different',async()=>{
  const t=await open(),p=t.page;await prep(p,[],'1');await openSong(p);
  await selectBox(p,1,0);await key(p,'C');
  eq(await chordAt(p,8,0),'C','C linked to Verse 2');
  await toggleLink(p);
  await selectBox(p,8,0);await clear(p);await key(p,'A');await key(p,'m');
  await toggleLink(p);
  await selectBox(p,1,0);
  await p.click('#eTp');await p.waitForTimeout(150);
  await p.click('#csheet [data-sc="section"]');
  await p.click('#csheet [data-tp="1"]');await p.click('#csheet [data-tp="1"]');
  await p.click('#csheet .ok');await p.waitForTimeout(120);
  eq(await chordAt(p,1,0),'D','Verse 1 is D');
  eq(await chordAt(p,8,0),'Am','Verse 2 keeps its different Am');
  eq(t.errors,[],'no page errors');await t.close()});

test('Smart: song mode and editor give the same names',async()=>{
  const t=await open(),p=t.page;
  await prep(p,[{l:1,c:0,n:'C#m7b5'},{l:1,c:4,n:'D/F#'},{l:1,c:8,n:'Bb'}]);
  await p.evaluate(()=>{openSong(songs[0]);tpSet(2)});
  await p.waitForTimeout(400);
  const shown=await p.evaluate(()=>[...document.querySelectorAll('#txt .chd')].map(e=>e.dataset.c));
  const want=await p.evaluate(()=>{const s=songs[0];return EvoCore.smart.transposeChords(s.lyrics.split('\n'),s.chords,2,{key:'C'}).chords.map(x=>x.n)});
  eq(shown,want,'song mode shows the same names as the editor transpose');
  eq(t.errors,[],'no page errors');await t.close()});
test('Smart: the key is the anchor – picking another key moves the chords; the first key or its relative only names it',async()=>{
  const t=await open(),p=t.page;
  await p.evaluate(()=>{songs[0].lyrics='[Verse]\npagi datang perlahan';songs[0].key='';songs[0].chords=[{l:1,c:0,n:'C'},{l:1,c:6,n:'Am'},{l:1,c:12,n:'F/A'}];save();openEdit(songs[0])});
  await p.waitForTimeout(400);
  const names=()=>p.evaluate(()=>chNow().map(x=>x.n).join(' '));
  await p.selectOption('#ek','C');await p.waitForTimeout(150);
  eq(await names(),'C Am F/A','first key: chords stay');
  await p.selectOption('#ek','D');await p.waitForTimeout(150);
  eq(await names(),'D Bm G/B','C → D moves every chord');
  await p.selectOption('#ek','F');await p.waitForTimeout(150);
  eq(await names(),'F Dm Bb/D','spelling follows the new key');
  await p.selectOption('#ek','C');await p.waitForTimeout(150);
  eq(await names(),'C Am F/A','back to C: the exact old names');
  await p.selectOption('#ek','Am');await p.waitForTimeout(150);
  eq(await names(),'C Am F/A','C → Am (relative) only names the key');
  await p.click('#eU');await p.waitForTimeout(150);await p.click('#eU');await p.waitForTimeout(150);
  eq([await names(),await p.evaluate(()=>$('#ek').value)],['F Dm Bb/D','F'],'undo: key and chords together, one step each');
  await p.click('#eS');await p.waitForTimeout(300);
  eq(await p.evaluate(()=>[songs[0].key,songs[0].chords.map(x=>x.n).join(' ')]),['F','F Dm Bb/D'],'saved');
  eq(t.errors,[],'no page errors');await t.close()});
};
