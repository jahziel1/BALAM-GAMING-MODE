import '@fontsource/inter';
import '@fontsource/rajdhani';
import './styles/index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'sonner';

import App from './App';
import { StoreProvider } from './application/providers/StoreProvider';

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
      <Toaster position="bottom-right" />
    </StoreProvider>
  </React.StrictMode>
);
