import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { listenForInstallPrompt } from './lib/install';
import './styles.css';

listenForInstallPrompt();

// Demande au navigateur de ne pas effacer la base locale quand l'espace disque manque.
navigator.storage?.persist?.().catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
