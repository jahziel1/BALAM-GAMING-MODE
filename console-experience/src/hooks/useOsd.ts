import { useCallback, useRef, useState } from 'react';

/**
 * Manages On-Screen Display (OSD) for volume changes.
 * Shows a transient indicator that auto-hides after 2 seconds.
 */
export function useOsd() {
  const [osdValue, setOsdValue] = useState(75);
  const [isOsdVisible, setIsOsdVisible] = useState(false);
  const osdTimeout = useRef<number | null>(null);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setOsdValue(newVolume);
    setIsOsdVisible(true);
    if (osdTimeout.current) window.clearTimeout(osdTimeout.current);
    osdTimeout.current = window.setTimeout(() => setIsOsdVisible(false), 2000);
  }, []);

  return { osdValue, isOsdVisible, handleVolumeChange };
}
