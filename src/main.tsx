import { render } from 'preact';
import { App } from './app/App.tsx';
import './ui/tokens.css';
import './ui/base.css';

const root = document.getElementById('app');
if (root === null) throw new Error('index.html has no #app element');
render(<App />, root);

// Production only: in dev, Vite serves unhashed modules that a cache-first worker would pin.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
