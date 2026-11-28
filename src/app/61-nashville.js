/* ===== EvoChord: Nashville numbers (file 61) =====
   A switch in the Key panel (song screen) shows every chord as its number in the song key: 1, 2m, 3m, 4, 5, 6m, 5/7, b7 …
   (EvoCore.chord.toNashville). Display only, like the transpose: the saved chords stay letters, and the numbers do not
   change when the song is transposed. Remembered on this device ('evo.nashville'). Needs a key (the song's key, else its
   first chord, as the transpose does). */

function nashOn(){try{return localStorage.getItem('evo.nashville')==='1'}catch(e){return false}}

chordName=(function(orig){return function(n){if(nashOn()&&cur){const k=tpBase();if(k)return EvoCore.chord.toNashville(String(n||''),k)}return orig.apply(this,arguments)}})(chordName);

(function(){const f=document.querySelector('#tpp .tpf');if(!f||$('#tpn'))return;
  const b=E('button','tpbtn tpnash','1 2 3');b.id='tpn';b.type='button';
  const paint=()=>{const on=nashOn();b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false');
    b.setAttribute('aria-label',L('Nashville numbers','Angka Nashville'));b.title=on?L('Show chord letters','Tampilkan huruf chord'):L('Show Nashville numbers','Tampilkan angka Nashville')};
  b.onclick=()=>{try{localStorage.setItem('evo.nashville',nashOn()?'0':'1')}catch(e){}paint();
    if(cur&&$('#play').classList.contains('on')){const ly=$('#lyr'),top=ly.scrollTop;render();ly.scrollTop=top}
    if(typeof tpBump==='function')tpBump()};
  paint();f.prepend(b)})();
