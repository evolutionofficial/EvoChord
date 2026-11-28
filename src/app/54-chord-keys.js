/* ===== EvoChord: minor keys in the song key list (file 54) =====
   Runs once at load. Adds the minor keys to #ek (the Key list of the song editor, 12-editor.js) after the
   major keys, before the separator. Existing options and their values are unchanged: EvoLyric shares the song data. */
(function(){const s=$('#ek');if(!s)return;
  const sep=[...s.options].find(o=>o.value==='__sep')||null;
  ['Am','Bbm','Bm','Cm','C#m','Dm','Ebm','Em','Fm','F#m','Gm','G#m'].forEach(k=>{const o=E('option','',k);o.value=k;s.insertBefore(o,sep)})})();
