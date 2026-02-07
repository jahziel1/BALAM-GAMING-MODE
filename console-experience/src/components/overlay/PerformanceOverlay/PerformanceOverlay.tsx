/**
 * Performance Overlay Component
 *
 * Displays real-time performance metrics (FPS, CPU, GPU, RAM) in the corner of the screen.
 * Similar to Steam Deck's performance overlay or MSI Afterburner on-screen display.
 *
 * ## Features
 * - Real-time FPS counter
 * - CPU usage percentage
 * - GPU usage percentage (placeholder until NVML integration)
 * - RAM usage (used/total GB)
 * - GPU temperature (placeholder until NVML integration)
 * - Configurable display modes: minimal, compact, full
 * - Configurable position: top-left, top-right, bottom-left, bottom-right
 *
 * ## Performance
 * - Updates every 1 second (configurable)
 * - Minimal overhead (<2% CPU)
 * - Uses Tauri invoke for backend metrics
 *
 * @module components/overlay/PerformanceOverlay
 */

import './PerformanceOverlay.css';

import { invoke } from '@tauri-apps/api/core';
import { Activity, Cpu, HardDrive, Thermometer, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface FPSStats {
  current_fps: number;
  avg_fps_1s: number;
  fps_1_percent_low: number;
  frame_time_ms: number;
}

interface PerformanceMetrics {
  cpu_usage: number;
  gpu_usage: number;
  ram_used_gb: number;
  ram_total_gb: number;
  gpu_temp_c: number | null;
  cpu_temp_c: number | null;
  gpu_power_w: number | null;
  fps: FPSStats | null;
}

interface PerformanceOverlayProps {
  /** Whether performance overlay is enabled */
  enabled: boolean;
  /** Position: top-left, top-right, bottom-left, bottom-right */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Display mode: minimal (FPS only), compact (FPS+GPU+CPU), full (all stats) */
  mode?: 'minimal' | 'compact' | 'full';
  /** Update interval in milliseconds (default: 1000ms) */
  updateInterval?: number;
}

/**
 * Performance Overlay Component
 *
 * Displays real-time performance metrics overlay.
 */
export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  enabled,
  position = 'top-right',
  mode = 'compact',
  updateInterval = 1000,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [useRTSS, setUseRTSS] = useState(false);

  // Check if RTSS is available on mount (for future use/debugging)
  useEffect(() => {
    const checkRTSS = async () => {
      try {
        const available = await invoke<boolean>('is_rtss_available');
        // Log for debugging - can be used to show toast notifications in the future
        if (available) {
          console.warn('RTSS available - fullscreen overlay supported');
        }
      } catch (error) {
        console.error('Failed to check RTSS availability:', error);
      }
    };
    void checkRTSS();
  }, []);

  // Auto-download PresentMon if not available (transparent for user)
  useEffect(() => {
    const ensurePresentMon = async () => {
      try {
        const available = await invoke<boolean>('is_presentmon_available');
        if (!available) {
          console.warn('PresentMon not found, downloading automatically...');
          await invoke('download_presentmon');
          console.warn('PresentMon downloaded successfully');
        }
      } catch (error) {
        console.error('Failed to ensure PresentMon availability:', error);
      }
    };
    void ensurePresentMon();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Fetch and update metrics (hybrid mode)
    const fetchAndUpdate = async () => {
      try {
        // Check current overlay mode
        const usingRTSS = await invoke<boolean>('is_using_rtss_overlay');
        setUseRTSS(usingRTSS);

        if (usingRTSS) {
          // RTSS mode: Just update RTSS, don't fetch for window overlay
          await invoke('update_rtss_overlay');
          setMetrics(null); // Hide window overlay
        } else {
          // Window mode: Fetch and display in window
          const newMetrics = await invoke<PerformanceMetrics>('get_performance_metrics');
          setMetrics(newMetrics);
        }
      } catch (error) {
        console.error('Failed to update overlay:', error);
      }
    };

    void fetchAndUpdate();

    // Poll metrics at interval
    const interval = setInterval(() => {
      void fetchAndUpdate();
    }, updateInterval);

    return () => clearInterval(interval);
  }, [enabled, updateInterval]);

  // Only show window overlay if not using RTSS
  if (!enabled || !metrics || useRTSS) return null;

  return (
    <div className={`perf-overlay perf-overlay-${position} perf-overlay-${mode}`}>
      {/* FPS (always shown) */}
      {metrics.fps ? (
        <div className="perf-stat perf-fps">
          <Activity size={14} className="perf-icon" />
          <span className="perf-value perf-value-large">{Math.round(metrics.fps.current_fps)}</span>
          <span className="perf-label">FPS</span>
        </div>
      ) : null}

      {/* CPU (compact and full) */}
      {mode !== 'minimal' && (
        <div className="perf-stat perf-cpu">
          <Cpu size={12} className="perf-icon" />
          <span className="perf-value">{Math.round(metrics.cpu_usage)}%</span>
          <span className="perf-label">CPU</span>
        </div>
      )}

      {/* GPU (compact and full) */}
      {mode !== 'minimal' && (
        <div className="perf-stat perf-gpu">
          <Zap size={12} className="perf-icon" />
          <span className="perf-value">{Math.round(metrics.gpu_usage)}%</span>
          <span className="perf-label">GPU</span>
        </div>
      )}

      {/* RAM (full only) */}
      {mode === 'full' && (
        <div className="perf-stat perf-ram">
          <HardDrive size={12} className="perf-icon" />
          <span className="perf-value">
            {metrics.ram_used_gb.toFixed(1)}/{metrics.ram_total_gb.toFixed(0)}GB
          </span>
          <span className="perf-label">RAM</span>
        </div>
      )}

      {/* GPU Temp (full only) */}
      {mode === 'full' && metrics.gpu_temp_c ? (
        <div className="perf-stat perf-temp">
          <Thermometer size={12} className="perf-icon" />
          <span className="perf-value">{Math.round(metrics.gpu_temp_c)}°C</span>
          <span className="perf-label">GPU Temp</span>
        </div>
      ) : null}

      {/* Frame time (full only) */}
      {mode === 'full' && metrics.fps ? (
        <div className="perf-stat perf-frametime">
          <span className="perf-value">{metrics.fps.frame_time_ms.toFixed(1)}ms</span>
          <span className="perf-label">Frame Time</span>
        </div>
      ) : null}
    </div>
  );
};

export default PerformanceOverlay;
