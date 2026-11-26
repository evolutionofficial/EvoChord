import './styles.css';
import { createStore } from './core/store.js';
import { startApp } from './ui/app.js';

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
