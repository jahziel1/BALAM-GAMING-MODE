/* eslint-disable react-hooks/set-state-in-effect */
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

/**
 * Performance Metrics Interface
 *
 * Matches Rust PerformanceMetrics struct from backend.
 */
export interface PerformanceMetrics {
  cpu_usage: number; // 0-100%
  gpu_usage: number; // 0-100%
  ram_used_gb: number;
  ram_total_gb: number;
  gpu_temp_c: number | null;
  cpu_temp_c: number | null;
  gpu_power_w: number | null;
  fps: FPSStats | null;
}

/**
 * FPS Statistics Interface
 *
 * Matches Rust FPSStats struct from backend.
 */
export interface FPSStats {
  current_fps: number;
  avg_fps_1s: number;
  fps_1_percent_low: number;
  frame_time_ms: number;
}

interface UsePerformanceMetricsOptions {
  /** Polling interval in milliseconds (default: 1000ms) */
  interval?: number;
  /** Whether to enable polling (default: true) */
  enabled?: boolean;
}

interface UsePerformanceMetricsReturn {
  metrics: PerformanceMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Performance Metrics Hook
 *
 * Fetches real-time performance metrics from backend with automatic polling.
 * Uses FPS Service (Named Pipe) → PresentMon (ETW) fallback chain.
 *
 * @param options - Configuration options for polling interval and enable state
 * @returns Performance metrics, loading state, error, and manual refresh function
 *
 * @example
 * ```tsx
 * const { metrics, loading, error } = usePerformanceMetrics({ interval: 1000 });
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * if (!metrics) return null;
 *
 * return <div>FPS: {metrics.fps?.current_fps ?? 'N/A'}</div>;
 * ```
 */
export const usePerformanceMetrics = (
  options: UsePerformanceMetricsOptions = {}
): UsePerformanceMetricsReturn => {
  const { interval = 1000, enabled = true } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      const data = await invoke<PerformanceMetrics>('get_performance_metrics');
      setMetrics(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Initial fetch - intentional setState in effect for data fetching
    void refresh();

    // Setup polling interval
    const intervalId = setInterval(() => {
      void refresh();
    }, interval);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, enabled]);

  return {
    metrics,
    loading,
    error,
    refresh,
  };
};
