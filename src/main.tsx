import { render } from 'preact';

const root = document.getElementById('app');
if (root === null) throw new Error('index.html has no #app element');
render(<p>Loading</p>, root);
