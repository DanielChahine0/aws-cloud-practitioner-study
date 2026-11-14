import { render } from 'preact';
import { App } from './app/App.tsx';
import { keepFocusClearOfBars } from './ui/focus-clear.ts';
import './ui/tokens.css';
import './ui/base.css';

const root = document.getElementById('app');
if (root === null) throw new Error('index.html has no #app element');
render(<App />, root);
keepFocusClearOfBars();

// Production only, and relative, so the worker's scope is the site's own folder on any host: in dev, Vite serves unhashed modules that a cache-first worker would pin.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => undefined);
  });
}
