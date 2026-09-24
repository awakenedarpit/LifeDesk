import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;
  if (!window.isSecureContext) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/LifeDesk/sw.js', { scope: '/LifeDesk/' })
      .then((registration) => {
        registration.update().catch(() => undefined);
      })
      .catch((error) => {
        console.error('LifeDesk service worker registration failed:', error);
      });
  });
};

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
