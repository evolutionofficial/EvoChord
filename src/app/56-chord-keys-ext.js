/* ===== EvoChord: extensions and altered chords on the chord keyboard (file 56) =====
   Rows: C D E F G A B | # b m 7 maj7 sus / | 2 4 5 6 9 11 13 | dim aug add alt.
   # and b after a root letter are its accidental (C#, Bb); after a number they alter it (C7b9, C7#11, Cm7b5, C7b13).
   After an alteration only 5, 9, 11 and 13 make sense. Backspace removes 11, 13 and alt in one go.
   Replaces chCan (13-notes-chords.js); CH_ROWS is changed before the keyboard is first built. */

CH_ROWS.splice(2, 1, ['2', '4', '5', '6', '9', '11', '13'], ['dim', 'aug', 'add', 'alt']);

function chCan(b, k) {
  if (/^[A-G]$/.test(k)) return true;
  if (b.length >= 12) return false;
  if (!/^[A-G]/.test(b)) return false;
  const slash = b.includes('/');
  if (k === '#' || k === 'b') return /[A-G]$/.test(b) || (!slash && /\d$/.test(b)); // accidental, or alteration after a number
  if (slash) return false;
  if (/[#b]$/.test(b) && !/^[A-G][#b]$/.test(b)) return ['5', '9', '11', '13'].includes(k); // C7b → 5 9 11 13
  if (k === 'm') return /^[A-G][#b]?$/.test(b);
  if (k === 'alt') return /^[A-G][#b]?7?$/.test(b);
  if (k === '/') return true;
  return !/alt$/.test(b);
}

// Backspace: remove the last whole token (11, 13, maj7, alt …), not just one character.
(function () {
  const TOK = /(maj7|sus|dim|aug|add|alt|11|13|[A-G]|[#b]|m|\/|\d)$/;
  const kb = $('#chkb');
  if (!kb) return;
  kb.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-a="bs"]');
    if (!b || !chs || chs.sel < 0) return;
    e.stopImmediatePropagation();
    chSet(chs.buf.replace(TOK, ''));
  }, true);
})();
