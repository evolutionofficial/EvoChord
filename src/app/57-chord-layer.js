/* ===== EvoChord: the chord layer (file 57) =====
   EvoLyric owns the lyrics. On this device a song is one sheet (lyric lines + beat rows, section labels and blank
   lines EvoChord added); in the shared database the lyrics stay exactly as EvoLyric wrote them and EvoChord'
   lines go to `rows` (EvoCore.layer). cloud.js calls evoSongIn when a song comes down and evoSongOut when it goes up.
   song.lyr = the lyrics as they came (kept on the device, never uploaded). */

// Lyrics of a song made in EvoChord (Chordtela, paste): the sheet without beat rows and trailing spaces.
function chordOwnLyrics(sheet){return String(sheet||'').split('\n').filter(l=>!EvoCore.beats.isBeatLine(l)).map(l=>l.replace(/\s+$/,'')).join('\n').replace(/\n+$/,'')}

// The lyrics a song came with (set once, then kept).
function songLyr(s){if(!s)return'';if(s.lyr==null)s.lyr=chordOwnLyrics(s.lyrics);return s.lyr}

window.evoSongIn=function(o){const m=EvoCore.layer.mergeLayer(o.lyrics,o.chords,o.rows);
  const r=Object.assign({},o,{lyrics:m.lyrics,chords:m.chords,lyr:m.lyr});delete r.rows;return r};

window.evoSongOut=function(s){const lyr=songLyr(s),x=EvoCore.layer.splitLayer(s.lyrics,s.chords||[],lyr);
  const r=Object.assign({},s,{lyrics:x.lyrics,chords:x.chords,rows:x.rows});delete r.lyr;return r};

/* A new song saved from the editor keeps the lyrics it was opened with (none for a blank song, the pasted text for
   Paste as new song): sections and beat rows added here stay EvoChord' own lines, not lyrics. Runs after the
   editor's own Save handler (registered later). */
$('#eS').addEventListener('click',()=>{if(cur&&cur.lyr==null&&typeof oe==='object'&&oe&&oe.lyr!=null){cur.lyr=oe.lyr;save()}});
