/**
 * Scan Progress Hook
 *
 * Monitors async game scanning progress via Tauri events.
 * Provides real-time updates during game discovery.
 *
 * @module hooks/useScanProgress
 */

import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useState } from 'react';

/**
 * Scan progress event payload
 */
export interface ScanProgress {
  /** Current step description */
  step: string;
  /** Current progress (0-100) */
  current: number;
  /** Total progress (100) */
  total: number;
}

/**
 * Scan complete event payload
 */
export interface ScanComplete {
  /** Number of games found */
  count: number;
  /** Duration in milliseconds */
  duration_ms: number;
}

/**
 * Scan progress hook
 *
 * @returns Scan status and progress info
 *
 * @example
 * ```tsx
 * const { isScanning, progress, gamesFound } = useScanProgress();
 *
 * if (isScanning) {
 *   return <div>Scanning: {progress?.step} ({progress?.current}%)</div>;
 * }
 * ```
 */
export function useScanProgress() {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [gamesFound, setGamesFound] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    // Listen for scan progress events
    const unlistenProgress = listen<ScanProgress>('scan-progress', (event) => {
      setIsScanning(true);
      setProgress(event.payload);
    });

    // Listen for scan complete events
    const unlistenComplete = listen<ScanComplete>('scan-complete', (event) => {
      setIsScanning(false);
      setProgress(null);
      setGamesFound(event.payload.count);
      setDuration(event.payload.duration_ms);

      // Clear stats after 5 seconds
      setTimeout(() => {
        setGamesFound(null);
        setDuration(null);
      }, 5000);
    });

    return () => {
      void unlistenProgress.then((fn) => fn());
      void unlistenComplete.then((fn) => fn());
    };
  }, []);

  /**
   * Reset scan state manually
   */
  const reset = useCallback(() => {
    setIsScanning(false);
    setProgress(null);
    setGamesFound(null);
    setDuration(null);
  }, []);

  return {
    /** Whether scan is currently in progress */
    isScanning,
    /** Current scan progress (null if not scanning) */
    progress,
    /** Number of games found (null if scan not complete) */
    gamesFound,
    /** Scan duration in milliseconds (null if scan not complete) */
    duration,
    /** Reset scan state manually */
    reset,
  };
}
