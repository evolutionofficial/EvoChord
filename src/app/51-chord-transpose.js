/* ===== EvoChords: key (transpose) button in the lyrics corner — card S1 =====
   Sits above the Speed button (#spb) inside #spc and copies its look and idle behaviour.
   The transpose is kept in cur._tp (-11..11) and drawn by chordName() in 50-chord-render.js.
   Only "Save key" writes to the song (chords and key), and only for library songs. */

let tpT=0,tpDown=0,tpSong=null,tpOptBase=null;

function tpBase(){ /* the song's own key (normalised: 'Db' not 'C#/Db'), else its first chord, else '' */
  if(!cur)return '';
  return EvoCore.chord.normKey(cur.key)||(cur.chords&&cur.chords[0]&&cur.chords[0].n)||'';
}

function tpKeyNow(){ /* key shown now, transposed; '' when the song has neither a key nor chords */
  const base=tpBase();
  if(!base)return '';
  try{return EvoCore.chord.transposeKey(base,cur._tp|0)}catch(e){return ''}
}

function tpBump(){clearTimeout(tpT);if($('#tpp').classList.contains('open'))tpT=setTimeout(()=>{if(tpDown)tpBump();else tpOpen(false)},3000)} /* idle -> back to the small corner button */

function tpOpen(on){
  const p=$('#tpp'),b=$('#tpb');
  if(on==null)on=!p.classList.contains('open');
  if(on&&$('#spp').classList.contains('open'))spOpen(false); /* one panel at a time */
  p.classList.toggle('open',on);b.classList.toggle('hid',on);b.setAttribute('aria-expanded',on?'true':'false');
  if(!on)p.classList.remove('act');
  tpBump();
}

function tpFillKeys(base){ /* the 12 options of #tpk, in pitch order from C; value = semitone offset from the base (-5..+6) */
  const sel=$('#tpk'),bpc=EvoCore.chord.pitchClass(base);
  sel.innerHTML='';
  for(let pc=0;pc<12;pc++){
    let off=((pc-bpc)%12+12)%12;if(off>6)off-=12;
    const o=document.createElement('option');
    o.value=String(off);o.textContent=EvoCore.chord.transposeKey(base,off);
    sel.appendChild(o);
  }
}

function tpPaint(){ /* labels, visibility and the song-change reset; runs after every lyrics redraw */
  const tb=$('#tpb');if(!tb)return;
  if(tpSong!==cur){if(tpSong)tpSong._tp=0;tpSong=cur;if(cur)cur._tp=0}
  const has=!!(cur&&cur.chords&&cur.chords.length);
  tb.style.display=has?'':'none';
  if(!has){if($('#tpp').classList.contains('open'))tpOpen(false);return}
  const t=cur._tp|0,k=tpKeyNow()||'–';
  const base=tpBase()||'C';
  if(tpOptBase!==base){tpOptBase=base;tpFillKeys(base)}
  let n=((t%12)+12)%12;if(n>6)n-=12;
  $('#tpk').value=String(n);
  $('#tpk').setAttribute('aria-label',L('Key','Nada'));
  $('#tpbv').textContent=k;
  $('#tpv').textContent=t>0?'+'+t:t<0?'−'+(-t):'0';
  $('#tph').textContent=L('Key','Nada');
  $('#tpbs').textContent=L('key','nada');
  tb.setAttribute('aria-label',L('Key','Nada'));
  $('#tpp').setAttribute('aria-label',L('Key','Nada'));
  $('#tpx').setAttribute('aria-label',L('Close key','Tutup nada'));
  $('#tpMinus').setAttribute('aria-label',L('Key down','Turunkan nada'));
  $('#tpPlus').setAttribute('aria-label',L('Key up','Naikkan nada'));
  $('#tpr').textContent=L('Reset','Reset');
  $('#tps').textContent=L('Save key','Simpan nada');
  $('#tpr').style.display=t?'':'none';
  $('#tps').style.display=(t&&!isTemp(cur))?'':'none';
}

function tpSet(v){ /* -/+/Reset: redraw the lyrics with the new chord names, keep the scroll position */
  if(!cur)return;
  const ly=$('#lyr'),top=ly.scrollTop;
  cur._tp=Math.max(-11,Math.min(11,v|0));
  render();
  ly.scrollTop=top;
  tpBump();
}

function tpSave(){ /* writes the transposed chords and key into a library song */
  if(!cur||isTemp(cur))return;
  const t=cur._tp|0;if(!t)return;
  const to=EvoCore.chord.transposeKey(tpBase()||'C',t); /* the same transpose as the editor and the display */
  (cur.chords||[]).forEach(c=>{if(c&&c.n)c.n=EvoCore.chord.transposeTo(String(c.n),t,to)});
  if(cur.key)cur.key=EvoCore.chord.transposeKey(EvoCore.chord.normKey(cur.key),t);
  cur.md=Date.now();cur._tp=0;
  save();render();note(L('Key saved','Nada disimpan'));
  tpBump();
}

(function tpInit(){
  const spc=$('#spc'),spb=$('#spb');
  const tpp=document.createElement('div');
  tpp.id='tpp';tpp.setAttribute('role','group');
  tpp.innerHTML='<div class="sph"><span id="tph"></span><b id="tpv"></b><button id="tpx" type="button"><svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg></button></div>'
    +'<div class="tpr"><button class="step" id="tpMinus" type="button">−</button><span class="tpkw"><select id="tpk"></select></span><button class="step" id="tpPlus" type="button">+</button></div>'
    +'<div class="tpf"><button class="tpbtn" id="tpr" type="button"></button><button class="tpbtn tpsave" id="tps" type="button"></button></div>';
  const tpb=document.createElement('button');
  tpb.id='tpb';tpb.type='button';tpb.setAttribute('aria-expanded','false');tpb.setAttribute('aria-controls','tpp');
  tpb.innerHTML='<b id="tpbv"></b><small id="tpbs"></small>';
  spc.insertBefore(tpp,spb);
  spc.insertBefore(tpb,spb);

  tpb.onclick=()=>tpOpen();
  $('#tpx').onclick=()=>tpOpen(false);
  $('#tpMinus').onclick=()=>tpSet((cur?cur._tp|0:0)-1);
  $('#tpPlus').onclick=()=>tpSet((cur?cur._tp|0:0)+1);
  $('#tpr').onclick=()=>tpSet(0);
  $('#tps').onclick=()=>tpSave();
  $('#tpk').onchange=()=>tpSet(+$('#tpk').value); /* tpSet redraws and restarts the idle timer (tpBump) */
  tpp.addEventListener('pointerdown',()=>{tpDown=1;tpBump()});
  tpp.addEventListener('pointerup',()=>{tpDown=0;tpBump()});
  tpp.addEventListener('pointercancel',()=>{tpDown=0;tpBump()});
  tpp.addEventListener('click',tpBump);

  new MutationObserver(tpPaint).observe($('#txt'),{childList:true});
  tpPaint();
})();
