import '@fontsource/inter';
import '@fontsource/rajdhani';
import './styles/index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';

import App from './App';
import { StoreProvider } from './application/providers/StoreProvider';

// Performance profiling
const startTime = performance.now();

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
      <Toaster position="bottom-right" />
    </StoreProvider>
  </React.StrictMode>
);

// Report boot time
window.addEventListener('load', () => {
  const loadTime = performance.now() - startTime;
  console.log(`⚡ Boot time: ${loadTime.toFixed(0)}ms`);

  if (loadTime > 2000) {
    console.warn('⚠️ Boot time exceeded 2s target');
  }

  // Hide splash screen after app loads
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 300);
  }
});
