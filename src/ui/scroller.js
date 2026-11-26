// Auto-scroll engine + stage gestures, ported 1:1 from EvoLyric (v22/v65/v130):
//   tap the lyrics            → play / pause
//   drag sideways             → speed 1–25 (14 px per step), shown in the speed HUD
//   hold still 1 s while on   → fast-forward (speed 30) until the finger lifts, eased in and out
//   pinch                     → font size
// Speed formula (same as EvoLyric): px/s = (speed + 3) × 0.8 × fontPx × 0.12,
// with sub-pixel smoothness (integer part via scrollTop, fraction via a GPU transform).

export const SPEED_MIN = 1;
export const SPEED_MAX = 25;
const SPEED_BONUS = 3;
const SPEED_SCALE = 0.8;
const BOOSTV = 30 + SPEED_BONUS;
const SPX = 14; // px of horizontal drag per speed step
export const FONT_MIN = 12;
export const FONT_MAX = 120;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * @param {object} o
 * @param {HTMLElement} o.container  the scrolling element (overflow-y:auto)
 * @param {HTMLElement} o.content    the element inside it that carries the sub-pixel transform
 * @param {HTMLElement} [o.hud]      speed HUD element (see songView.css .sv-hud)
 * @param {() => number} o.getSpeed
 * @param {(v:number) => void} o.setSpeed
 * @param {() => number} o.getFont
 * @param {(v:number) => void} o.setFont      apply + store the new font size
 * @param {(playing:boolean) => void} [o.onPlayChange]
 */
export function createScroller(o) {
  const L = o.container;
  const txt = o.content;
  let playing = false;
  let raf = 0;
  let last = 0;
  let pos = 0;
  let boostSp = 0;
  let bst = 0;
  let wake = null;
  let G = null;
  const PT = new Map();
  let hudT = 0;
  let hudO = 0;

  // ---- engine -------------------------------------------------------------
  function tick(t) {
    if (!playing) return;
    if (!last) last = t;
    const dt = Math.min((t - last) / 1000, 0.1);
    last = t;
    const base = o.getSpeed() + SPEED_BONUS;
    bst += ((boostSp ? 1 : 0) - bst) * Math.min(1, dt * 6);
    if (!boostSp && bst < 0.01) bst = 0;
    const sp = base + ((boostSp || base) - base) * bst;
    pos += sp * SPEED_SCALE * o.getFont() * 0.12 * dt;
    const ip = Math.floor(pos);
    if (L.scrollTop !== ip) L.scrollTop = ip;
    txt.style.transform = 'translate3d(0,' + (ip - pos).toFixed(3) + 'px,0)';
    if (L.scrollTop + L.clientHeight >= L.scrollHeight - 2) {
      setPlay(false);
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  function setPlay(on) {
    on = !!on;
    if (on === playing) return;
    playing = on;
    if (on) {
      last = 0;
      bst = 0;
      pos = L.scrollTop;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
      acquireWake();
    } else {
      cancelAnimationFrame(raf);
      raf = 0;
      if (txt.style.transform) {
        L.scrollTop = Math.round(pos);
        txt.style.transform = '';
        pos = L.scrollTop;
      }
    }
    o.onPlayChange?.(playing);
  }

  // Keep the screen on while the song screen is open (re-acquired when the browser drops it).
  function acquireWake() {
    if (document.hidden || wake || !navigator.wakeLock?.request) return;
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        wake = l;
        l.addEventListener('release', () => {
          if (wake === l) wake = null;
        });
      })
      .catch(() => {});
  }
  const onVisible = () => {
    if (!document.hidden) acquireWake();
    resetInput();
  };

  // ---- speed HUD -----------------------------------------------------------
  function hudSet() {
    if (!o.hud) return;
    const v = Math.round(o.getSpeed());
    o.hud.querySelector('b').textContent = v;
    o.hud.style.setProperty('--p', ((v - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)).toFixed(4));
  }
  function hudShow() {
    const H = o.hud;
    if (!H) return;
    clearTimeout(hudT);
    clearTimeout(hudO);
    hudSet();
    if (H.classList.contains('on') && !H.classList.contains('out')) return;
    H.classList.remove('on', 'out');
    void H.offsetWidth;
    H.classList.add('on');
  }
  function hudHide() {
    const H = o.hud;
    if (!H) return;
    clearTimeout(hudT);
    hudT = setTimeout(() => {
      H.classList.remove('on');
      void H.offsetWidth;
      H.classList.add('out');
      hudO = setTimeout(() => H.classList.remove('out'), 880);
    }, 420);
  }

  // ---- gestures --------------------------------------------------------------
  const pdist = () => {
    const [a, b] = [...PT.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button, a, input, select, textarea')) return;
    try {
      L.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    PT.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (G) clearTimeout(G.h);
    if (PT.size === 2) {
      G = { pinch: 1, d0: pdist() || 1, f0: o.getFont() };
      return;
    }
    if (PT.size > 2) return;
    G = { x: e.clientX, y: e.clientY, t: performance.now(), mv: 0, sp: 0, vert: 0, boost: 0 };
    if (playing)
      G.h = setTimeout(() => {
        const g = G;
        if (g && !g.mv && !g.sp && !g.pinch && playing) {
          g.boost = 1;
          boostSp = BOOSTV;
        }
      }, 1000);
  }
  function onMove(e) {
    const p = PT.get(e.pointerId);
    if (!p || !G) return;
    p.x = e.clientX;
    p.y = e.clientY;
    if (G.pinch) {
      if (PT.size === 2) {
        const L0 = L.scrollTop;
        const old = o.getFont();
        const nf = clamp(Math.round(G.f0 * Math.pow(pdist() / G.d0, 1.35) * 10) / 10, FONT_MIN, FONT_MAX);
        if (nf !== old) {
          o.setFont(nf);
          L.scrollTop = (L0 * nf) / old;
          pos = L.scrollTop;
        }
      }
      return;
    }
    const dx = e.clientX - G.x;
    const dy = e.clientY - G.y;
    if (G.sp) {
      const v = clamp(G.s0 + Math.round((e.clientX - G.sx) / SPX), SPEED_MIN, SPEED_MAX);
      if (v !== Math.round(o.getSpeed())) o.setSpeed(v);
      hudSet();
      return;
    }
    if (Math.hypot(dx, dy) > 12) {
      G.mv = 1;
      clearTimeout(G.h);
      if (!G.vert && Math.abs(dx) > 1.4 * Math.abs(dy)) {
        G.sp = 1;
        G.sx = e.clientX;
        G.s0 = Math.round(o.getSpeed());
        hudShow();
      } else G.vert = 1;
    }
  }
  function gEnd(e, cancel) {
    PT.delete(e.pointerId);
    if (!G) return;
    if (G.pinch) {
      if (!PT.size) G = null;
      return;
    }
    const g = G;
    G = null;
    clearTimeout(g.h);
    if (g.boost) {
      boostSp = 0;
      return;
    }
    if (g.sp) {
      hudHide();
      return;
    }
    if (!cancel && !g.mv && performance.now() - g.t < 600) setPlay(!playing);
  }
  const onUp = (e) => gEnd(e, false);
  const onCancel = (e) => gEnd(e, true);
  const onTouchMove = (e) => {
    if (e.touches.length > 1) e.preventDefault();
  };
  const onCtx = (e) => e.preventDefault();
  // A suspended page can lose the "finger up": forget half-finished touches.
  function resetInput() {
    PT.clear();
    if (G) clearTimeout(G.h);
    G = null;
    boostSp = 0;
  }

  L.addEventListener('pointerdown', onDown);
  L.addEventListener('pointermove', onMove);
  L.addEventListener('pointerup', onUp);
  L.addEventListener('pointercancel', onCancel);
  L.addEventListener('touchmove', onTouchMove, { passive: false });
  L.addEventListener('contextmenu', onCtx);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('pagehide', resetInput);
  window.addEventListener('blur', resetInput);
  acquireWake();

  return {
    play: () => setPlay(true),
    pause: () => setPlay(false),
    toggle: () => setPlay(!playing),
    isPlaying: () => playing,
    /** Call after the content changes height (transpose, font) so the engine continues from the right spot. */
    sync: () => {
      pos = L.scrollTop;
    },
    showHud: () => {
      hudShow();
      hudHide();
    },
    destroy() {
      setPlay(false);
      clearTimeout(hudT);
      clearTimeout(hudO);
      L.removeEventListener('pointerdown', onDown);
      L.removeEventListener('pointermove', onMove);
      L.removeEventListener('pointerup', onUp);
      L.removeEventListener('pointercancel', onCancel);
      L.removeEventListener('touchmove', onTouchMove);
      L.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', resetInput);
      window.removeEventListener('blur', resetInput);
      wake?.release?.().catch?.(() => {});
      wake = null;
    },
  };
}
