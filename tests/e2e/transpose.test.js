module.exports=({test,assert,eq,open})=>{
test('Key: the key in the Key panel is a dropdown of 12 keys; picking one transposes the chords',async()=>{
  const t=await open(),p=t.page;
  await p.evaluate(()=>{songs[0].key='C';songs[0].chords=[{l:1,c:0,n:'C'},{l:2,c:0,n:'G'}];save()});
  await p.evaluate(()=>openSong(songs[0]));await p.waitForTimeout(400);
  await p.click('#tpb');await p.waitForTimeout(300);
  eq(await p.evaluate(()=>$('#tpk').options.length),12,'12 keys in the dropdown');
  eq(await p.evaluate(()=>$('#tpk').value),'0','value 0 for the base key');
  eq(await p.evaluate(()=>$('#tpk').selectedOptions[0].textContent),'C','selected key is C');
  await p.selectOption('#tpk',{label:'D'});await p.waitForTimeout(300);
  eq(await p.evaluate(()=>cur._tp),2,'transposed by 2 semitones');
  eq(await p.evaluate(()=>document.querySelector('#txt .chd').dataset.c),'D','chord redrawn as D');
  eq(await p.evaluate(()=>$('#tpbv').textContent),'D','button shows D');
  await p.click('#tpr');await p.waitForTimeout(300);
  eq(await p.evaluate(()=>cur._tp),0,'reset back to 0');
  eq(t.errors,[],'no page errors');await t.close()});
test('Key: a minor key lists minor keys',async()=>{
  const t=await open(),p=t.page;
  await p.evaluate(()=>{songs[0].key='Am';songs[0].chords=[{l:0,c:0,n:'Am'}];save()});
  await p.evaluate(()=>openSong(songs[0]));await p.waitForTimeout(400);
  await p.click('#tpb');await p.waitForTimeout(300);
  const o=await p.evaluate(()=>[...$('#tpk').options].map(x=>x.textContent));
  eq(o.length,12,'12 keys');
  eq(o.every(s=>s.endsWith('m')),true,'every option is minor');
  eq(o.includes('Am'),true,'Am is listed');
  eq(t.errors,[],'no page errors');await t.close()});
};
