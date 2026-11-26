// App shell: hash router + view lifecycle.
//
// Routes
//   #/                 library (libraryView)
//   #/song/<id>        play a song with chords (songView)
//   #/edit/<id>        edit title/artist/key/lyrics (lyricEditView); id "new" creates a song
//   #/chords/<id>      chord boxes + chord keyboard (chordEditorView)
//   #/import           Chordtela link or pasted chord sheet (importView)
//
// Every view module exports `render(root, ctx, params)` and may return a cleanup function.
// ctx = { store, go(path), back() }

import { render as libraryView } from './libraryView.js';
import { render as songView } from './songView.js';
import { render as lyricEditView } from './lyricEditView.js';
import { render as chordEditorView } from './chordEditorView.js';
import { render as importView } from './importView.js';

const ROUTES = [
  [/^\/$/, libraryView],
  [/^\/song\/([\w-]+)$/, songView],
  [/^\/edit\/([\w-]+)$/, lyricEditView],
  [/^\/chords\/([\w-]+)$/, chordEditorView],
  [/^\/import$/, importView],
];

export function startApp(root, store) {
  let cleanup = null;
  const ctx = {
    store,
    go: (path) => {
      if (location.hash === '#' + path) show();
      else location.hash = path;
    },
    back: () => (history.length > 1 ? history.back() : ctx.go('/')),
  };

  function show() {
    const path = location.hash.replace(/^#/, '') || '/';
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    root.textContent = '';
    for (const [re, view] of ROUTES) {
      const m = re.exec(path);
      if (m) {
        const el = document.createElement('main');
        el.className = 'view';
        root.append(el);
        cleanup = view(el, ctx, m.slice(1)) || null;
        window.scrollTo(0, 0);
        return;
      }
    }
    ctx.go('/');
  }

  window.addEventListener('hashchange', show);
  show();
  return ctx;
}
