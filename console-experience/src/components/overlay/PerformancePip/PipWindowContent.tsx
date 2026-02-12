import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

import type { OverlayLevel } from '../../../application/stores';
import { PerformancePip } from './PerformancePip';

/**
 * PiP Window Content Wrapper
 *
 * This component is ONLY rendered in the PiP window.
 * It listens for configuration changes from the main window via events.
 */
export const PipWindowContent: React.FC = () => {
  const [level, setLevel] = useState<OverlayLevel>(1);

  // Make body and html fully transparent
  useEffect(() => {
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';

    return () => {
      // Restore on unmount (shouldn't happen in PiP window, but just in case)
      document.body.style.background = '';
      document.documentElement.style.background = '';
    };
  }, []);

  useEffect(() => {
    // Listen for configuration changes from main window
    const unlisten = listen<{ level: OverlayLevel }>('pip-config-changed', (event) => {
      setLevel(event.payload.level);
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        overflow: 'hidden',
      }}
    >
      <PerformancePip level={level} opacity={1} />
    </div>
  );
};
