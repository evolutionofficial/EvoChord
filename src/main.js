import './styles.css';
import { createStore } from './core/store.js';
import { startApp } from './ui/app.js';
import { findChordtelaUrl } from './features/import/importer.js';
import { setPendingUrl, clearSearch } from './features/import/pending.js';

// Android share target: Chrome opens /share?url=…&text=… when a page is shared to Evo Chord.
if (location.pathname === '/share') {
  const q = new URLSearchParams(location.search);
  const link = findChordtelaUrl([q.get('url'), q.get('text'), q.get('title')].filter(Boolean).join(' '));
  if (link) {
    setPendingUrl(link);
    clearSearch();
  }
  history.replaceState(null, '', '/' + (link ? '#/import' : '#/'));
}

const store = createStore();

function applyTheme() {
  document.documentElement.dataset.theme = store.prefs().theme === 'light' ? 'light' : 'dark';
}
applyTheme();
store.subscribe(applyTheme);

startApp(document.getElementById('app'), store);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js');
}
