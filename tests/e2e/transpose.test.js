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
test('Key: Nashville numbers – 1 2 3 shows chords as numbers in the song key; they stay when transposed; letters are saved',async()=>{
  const t=await open(),p=t.page;
  await p.evaluate(()=>{localStorage.removeItem('evo.nashville');songs[0].lyrics='[Verse]\npagi datang perlahan\nsampai pagi tiba';songs[0].key='C';songs[0].chords=[{l:1,c:0,n:'C'},{l:1,c:6,n:'G/B'},{l:2,c:0,n:'Am'},{l:2,c:6,n:'Bb'}];save();openSong(songs[0])});
  await p.waitForTimeout(400);
  const shown=()=>p.evaluate(()=>[...document.querySelectorAll('#txt .chd')].map(e=>e.dataset.c).join(' '));
  eq(await shown(),'C G/B Am Bb','letters by default');
  await p.click('#tpb');await p.waitForTimeout(250);await p.click('#tpn');await p.waitForTimeout(250);
  eq(await shown(),'1 5/7 6m b7','numbers');
  await p.evaluate(()=>tpSet(2));await p.waitForTimeout(250);
  eq(await shown(),'1 5/7 6m b7','numbers do not change with transpose');
  eq(await p.evaluate(()=>[songs[0].chords.map(x=>x.n).join(' '),localStorage.getItem('evo.nashville')]),['C G/B Am Bb','1'],'saved chords are letters; the choice is remembered');
  await p.click('#tpn');await p.waitForTimeout(250);
  eq(await shown(),'D A/C# Bm C','letters again, transposed');
  eq(t.errors,[],'no page errors');await t.close()});
};
