/* ===== EvoChords: "Get chords from Chordtela" for the song in the editor (file 58) =====
   The chords of a Chordtela sheet (or of chord text pasted after the Google step) go onto the song's own lyric lines
   (EvoCore.layer.importChords). The lyrics are never changed. chordIn (53) hands its text here while chordInto is set. */

let chordInto=false;

/* the Chordtela sheet behind a link (the same fetch and messages as chordIn), or the chord text itself.
   Resolves {lyrics,chords} or null (the error is shown). */
async function chordFetch(text){
  text=String(text||'');
  const u=chordUrlIn(text);
  if(u){
    note(L('Getting chords…','Mengambil chord…'));
    let res;
    try{res=await fetch('/api/chordtela?url='+encodeURIComponent(u),{cache:'no-cache'})}
    catch(e){note(L('You are offline. Chords need an internet connection.','Kamu sedang offline. Ambil chord butuh internet.'),true);return null}
    const r=await res.json().catch(()=>({error:'upstream'}));
    const why=r.error||(!res.ok||!r.lyrics?'upstream':'');
    if(why){
      note(why==='bad_url'||why==='not_found'?L('That page was not found on Chordtela.','Halaman itu tidak ditemukan di Chordtela.')
        :why==='no_chords'?L('No chords could be read on that page. Copy the chords as text instead.','Chord di halaman itu belum bisa dibaca. Salin teks chord-nya saja.')
        :L('Chordtela cannot be reached right now.','Chordtela sedang tidak bisa dibuka.'),true);
      return null}
    /* the original version of the page (the one the song opens with) */
    const v=(r.versions&&r.versions[r.main|0])||r;
    return{lyrics:v.lyrics,chords:v.chords||[]}}
  const s=EvoCore.sheet.parseChordSheet(text);
  if(s.chords.length>=2)return{lyrics:s.lyrics,chords:s.chords};
  note(L('No chords found in that text. Copy the chords first, then try again.','Tidak ada chord di teks itu. Salin chord-nya dulu, lalu coba lagi.'),true);
  return null}

/* the chords of src go onto the lines of the song in the editor; chords already there are replaced (after a question) */
async function chordImport(text){
  chordInto=false;
  const src=await chordFetch(text);
  ctxClose();
  if(!src)return false;
  const go=()=>{if(!chs)return;
    const r=EvoCore.layer.importChords(chs.lines.join('\n'),chNow(),src.lyrics,src.chords,EvoCore.lineedit.editRow);
    chs.lines=r.lyrics.split('\n');chs.map={};r.chords.forEach(x=>{chs.map[x.l+':'+x.c]=x.n});chBuild(null);
    if(r.matched===0)note(L('No line matched these lyrics.','Tidak ada baris yang cocok dengan lirik lagu ini.'),true);
    else note(L(`Chords added on ${r.matched} of ${r.lines} lines.`,`Chord ditempel di ${r.matched} dari ${r.lines} baris.`))};
  if(chNow().length>0)ask(L('Replace the chords?','Ganti chord yang ada?'),L('Chords from Chordtela replace the chords on matching lines.','Chord dari Chordtela menggantikan chord di baris yang cocok.'),L('Replace','Ganti'),go);
  else go();
  return true}

/* toolbar button next to the notes button: asks for the song on Google, then the usual return sheet brings the chords */
(function(){const n=$('#eN');if(!n||$('#eCt'))return;
  const b=document.createElement('button');b.id='eCt';b.type='button';
  const lab=L('Get chords from Chordtela','Ambil chord dari Chordtela');b.setAttribute('aria-label',lab);b.title=lab;
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>';
  b.onclick=()=>{const t=$('#et').value.trim();
    if(!t){note(L('Type the title first','Isi judul dulu'),true);return}
    chordInto=true;wlGoogle((t+' '+$('#ea').value).trim(),true)};
  n.after(b)})();
