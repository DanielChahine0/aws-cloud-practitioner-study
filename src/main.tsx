import { render } from 'preact';
import { App } from './app/App.tsx';
import './ui/tokens.css';
import './ui/base.css';

const root = document.getElementById('app');
if (root === null) throw new Error('index.html has no #app element');
render(<App />, root);
