import './PerformancePip.css';

import React from 'react';

import type { OverlayLevel } from '../../../application/stores';
import { usePerformanceMetrics } from '../../../hooks/usePerformanceMetrics';

interface PerformancePipProps {
  /** Display level (0-4) */
  level: OverlayLevel;
  /** Opacity (0-1) */
  opacity: number;
}

/**
 * Performance PiP Component
 *
 * Steam Deck style performance overlay with configurable detail levels.
 * Fixed position (top-right), always-on-top, non-interactive.
 *
 * Uses FPS Service (Named Pipe) → PresentMon (ETW) fallback chain for FPS.
 * Polls metrics every 1 second.
 *
 * @example
 * ```tsx
 * <PerformancePip level={3} opacity={0.9} />
 * ```
 */
export const PerformancePip: React.FC<PerformancePipProps> = React.memo(({ level, opacity }) => {
  const { metrics, loading, error } = usePerformanceMetrics({ interval: 1000, enabled: level > 0 });

  // Level 0: Hidden
  if (level === 0) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className="performance-pip">
        <div className="pip-loading" style={{ opacity }}>
          Loading metrics...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="performance-pip">
        <div className="pip-error" style={{ opacity }}>
          Error: {error}
        </div>
      </div>
    );
  }

  // No metrics available
  if (!metrics) {
    return null;
  }

  const fps = metrics.fps?.current_fps ?? 0;
  const frameTime = metrics.fps?.frame_time_ms ?? 0;
  const cpuUsage = metrics.cpu_usage;
  const gpuUsage = metrics.gpu_usage;
  const ramUsed = metrics.ram_used_gb;
  const ramTotal = metrics.ram_total_gb;
  const gpuTemp = metrics.gpu_temp_c;
  const cpuTemp = metrics.cpu_temp_c;
  const gpuPower = metrics.gpu_power_w;

  return (
    <div className="performance-pip">
      <div className="pip-container" style={{ opacity }}>
        {/* Level 1+: FPS - Compact inline display */}
        {level >= 1 ? (
          <div className="pip-row" style={{ gap: '4px' }}>
            <span className="fps-value">{Math.round(fps)}</span>
            <span className="frame-time" style={{ fontSize: '11px', alignSelf: 'center' }}>
              FPS
            </span>
          </div>
        ) : null}

        {/* Level 2+: Frame time */}
        {level >= 2 ? (
          <div className="pip-row">
            <span className="frame-time" style={{ fontSize: '11px' }}>
              {frameTime.toFixed(1)}ms
            </span>
          </div>
        ) : null}

        {/* Level 3+: CPU/GPU usage - Compact */}
        {level >= 3 ? (
          <>
            <div className="pip-row">
              <span className="metric-label">CPU</span>
              <span className="metric-value">{cpuUsage.toFixed(0)}%</span>
              {cpuTemp ? <span className="temp-value">{cpuTemp.toFixed(0)}°</span> : null}
            </div>
            <div className="pip-row">
              <span className="metric-label">GPU</span>
              <span className="metric-value">{gpuUsage.toFixed(0)}%</span>
              {gpuTemp ? <span className="temp-value">{gpuTemp.toFixed(0)}°</span> : null}
            </div>
          </>
        ) : null}

        {/* Level 4: RAM + GPU Power - Compact */}
        {level >= 4 ? (
          <>
            <div className="pip-row">
              <span className="metric-label">RAM</span>
              <span className="metric-value">
                {ramUsed.toFixed(1)}/{ramTotal.toFixed(0)}GB
              </span>
            </div>
            {gpuPower ? (
              <div className="pip-row">
                <span className="metric-label">PWR</span>
                <span className="metric-value">{gpuPower.toFixed(0)}W</span>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
});

PerformancePip.displayName = 'PerformancePip';
