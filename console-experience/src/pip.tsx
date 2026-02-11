/* eslint-disable @typescript-eslint/no-non-null-assertion */
import './pip.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { PerformancePip } from './components/overlay/PerformancePip';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PerformancePip />
  </React.StrictMode>
);
