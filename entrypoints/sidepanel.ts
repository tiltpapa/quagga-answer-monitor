import App from './sidepanel/App.svelte';
import './sidepanel/app.css';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;