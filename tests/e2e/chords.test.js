module.exports=({test,assert,eq,open})=>{
const LY='[Verse]\nPulang lagi\nKe rumah';
const prep=async p=>{await p.evaluate(l=>{songs[0].lyrics=l;delete songs[0].chords;save()},LY)};
const key=(p,k)=>p.click('#chkb [data-k="'+k+'"]'),act=(p,a)=>p.click('#chkb [data-a="'+a+'"]');
test('Chords: one box per 2 characters, same number on every row, typed with the chord keyboard, saved on the song',async()=>{
  const t=await open(),p=t.page;await prep(p);await p.evaluate(()=>openEdit(songs[0]));await p.waitForTimeout(300);
  await p.waitForTimeout(100);
  eq(await p.evaluate(()=>[...document.querySelectorAll('#chtx .chrow')].map(r=>r.querySelectorAll('.chc').length)),[16,16],'every row has the same number of boxes (longest row + 4, at least 16)');
  await p.click('#chtx .chc >> nth=0 >> .chn');
  eq(await p.evaluate(()=>$('#chkb [data-k="#"]').disabled),true,'# needs a root first');
  await key(p,'C');await key(p,'#');await key(p,'m');await key(p,'7');
  eq(await p.evaluate(()=>document.querySelectorAll('#chtx .chn')[0].textContent),'C#m7','first box');
  eq(await p.evaluate(()=>$('#chkb [data-k="m"]').disabled),true,'m only right after the root');
  await act(p,'next');await key(p,'G');await key(p,'/');await key(p,'B');
  await act(p,'bs');await key(p,'D');
  await p.click('#eS');await p.waitForTimeout(400);
  eq(await p.evaluate(()=>songs.find(s=>s.id==='s1').chords),[{l:1,c:0,n:'C#m7'},{l:1,c:2,n:'G/D'}],'saved chords');
  eq(t.errors,[],'no page errors');await t.close()});
test('Chords: shown above the lyrics in the play screen without changing the text',async()=>{
  const t=await open(),p=t.page;await prep(p);
  await p.evaluate(()=>{songs[0].chords=[{l:1,c:0,n:'Am'},{l:2,c:4,n:'F'}];save();openSong(songs[0])});await p.waitForTimeout(500);
  eq(await p.evaluate(()=>[...document.querySelectorAll('#txt .chd')].map(e=>e.dataset.c)),['Am','F'],'anchors');
  eq(await p.evaluate(()=>[...document.querySelectorAll('#txt .ln.hasch')].map(e=>e.textContent)),['Pulang lagi','Ke rumah'],'text unchanged');
  eq(t.errors,[],'no page errors');await t.close()});
test('Chords: Exit asks before losing chord changes',async()=>{
  const t=await open(),p=t.page;await prep(p);await p.evaluate(()=>openEdit(songs[0]));await p.waitForTimeout(300);
  await p.click('#chtx .chc >> nth=0 >> .chn');await key(p,'E');await p.click('#eX');await p.waitForTimeout(200);
  eq(await p.evaluate(()=>[$('#edit').classList.contains('on'),$('#eX').classList.contains('arm')]),[true,true],'still in the editor: Exit asks for a second tap');
  await t.close()});
test('Chords: the first keyboard row is the key\'s chord family; one tap writes it and moves on',async()=>{
  const t=await open(),p=t.page;await prep(p);await p.evaluate(()=>openEdit(songs[0]));await p.waitForTimeout(300);
  await p.selectOption('#ek','C');await p.waitForTimeout(100);
  await p.click('#chtx .chc >> nth=0 >> .chn');
  eq(await p.evaluate(()=>[...document.querySelectorAll('#chkb .chfam button')].map(b=>b.textContent)),['C','Dm','Em','F','G','Am','Bdim','G/B'],'family row of C');
  await p.click('#chkb .chfam button[data-r="G/B"]');
  eq(await p.evaluate(()=>document.querySelectorAll('#chtx .chc .chn')[0].textContent),'G/B','box 0 has G/B');
  eq(await p.evaluate(()=>document.querySelectorAll('#chtx .chc')[1].classList.contains('on')),true,'box 1 selected');
  eq(t.errors,[],'no page errors');await t.close()});
test('Chords: minor keys are in the Key list and give the minor family',async()=>{
  const t=await open(),p=t.page;await prep(p);await p.evaluate(()=>openEdit(songs[0]));await p.waitForTimeout(300);
  await p.selectOption('#ek','Am');await p.waitForTimeout(100);
  await p.click('#chtx .chc >> nth=0 >> .chn');
  eq(await p.evaluate(()=>[...document.querySelectorAll('#chkb .chfam button')].map(b=>b.textContent)),['Am','Bdim','C','Dm','Em','F','G','E'],'family row of Am');
  eq(t.errors,[],'no page errors');await t.close()});
test('Chords: no key, no family row',async()=>{
  const t=await open(),p=t.page;await prep(p);await p.evaluate(()=>openEdit(songs[0]));await p.waitForTimeout(300);
  await p.selectOption('#ek','');await p.waitForTimeout(100);
  await p.click('#chtx .chc >> nth=0 >> .chn');
  eq(await p.isHidden('#chkb .chfam'),true,'family row hidden');
  eq(t.errors,[],'no page errors');await t.close()});
test('Chords: extensions and altered chords – 11, 13, alt, and # / b after a number (C7b9, C7#11, Cm7b5)',async()=>{
  const t=await open(),p=t.page;await prep(p);await p.evaluate(()=>openEdit(songs[0]));await p.waitForTimeout(300);
  await p.click('#chtx .chc >> nth=0 >> .chn');
  const cur=()=>p.evaluate(()=>$('#chkb .chcur').textContent),dis=k=>p.evaluate(k=>$('#chkb [data-k="'+k+'"]').disabled,k);
  await key(p,'C');await key(p,'7');await key(p,'b');eq(await cur(),'C7b','alteration after 7');
  eq([await dis('9'),await dis('13'),await dis('2'),await dis('m')],[false,false,true,true],'after b only 5 9 11 13');
  await key(p,'9');eq(await cur(),'C7b9','C7b9');
  await act(p,'clr');await key(p,'C');await key(p,'7');await key(p,'#');await key(p,'11');eq(await cur(),'C7#11','C7#11');
  await act(p,'bs');eq(await cur(),'C7#','backspace removes 11 at once');
  await act(p,'clr');await key(p,'C');await key(p,'m');await key(p,'7');await key(p,'b');await key(p,'5');eq(await cur(),'Cm7b5','Cm7b5');
  await act(p,'clr');await key(p,'G');await key(p,'13');eq(await cur(),'G13','G13');
  await act(p,'clr');await key(p,'G');await key(p,'7');await key(p,'alt');eq(await cur(),'G7alt','G7alt');
  eq(await dis('9'),true,'nothing after alt');
  await act(p,'bs');eq(await cur(),'G7','backspace removes alt');
  eq(t.errors,[],'no page errors');await t.close()});
test('Chords: names close together move apart above the text (and stay on screen); the word itself is not split',async()=>{
  const t=await open(),p=t.page;
  await p.evaluate(()=>{songs[0].lyrics='[Verse]\nhidup pun akan ku beri';songs[0].chords=[{l:1,c:0,n:'E'},{l:1,c:18,n:'D#m'},{l:1,c:20,n:'G#m'}];save();openSong(songs[0])});
  await p.waitForTimeout(700);
  const r=await p.evaluate(()=>{const as=[...document.querySelectorAll('#txt .chd')];
    const box=a=>{const r=a.getBoundingClientRect(),dx=parseFloat(a.style.getPropertyValue('--dx'))||0;return{l:r.left+dx,r:r.left+dx+chordLabelWidth(a)}};
    const b=as.map(box);return{margins:as.map(a=>a.style.marginLeft),apart:b[2].l>=b[1].r,moved:as.some(a=>Math.abs(parseFloat(a.style.getPropertyValue('--dx'))||0)>0),text:document.querySelector('#txt .ln.hasch').textContent}});
  eq(r.margins,['','',''],'no space pushed into the text');
  eq([r.apart,r.moved,r.text],[true,true,'hidup pun akan ku beri'],'a label moved, labels apart, text unchanged');
  eq(t.errors,[],'no page errors');await t.close()});
};
