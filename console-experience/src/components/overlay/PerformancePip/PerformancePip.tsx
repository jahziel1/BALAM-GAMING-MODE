import './PerformancePip.css';

import { invoke } from '@tauri-apps/api/core';
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

export const PerformancePip: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  // Poll performance metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await invoke<PerformanceMetrics>('get_performance_metrics');
        setMetrics(data);
      } catch {
        // Silent fail - metrics will retry on next interval
      }
    };

    void fetchMetrics();
    const interval = setInterval(() => void fetchMetrics(), 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // Get color based on value and thresholds
  const getColor = (value: number, type: 'usage' | 'temp' | 'fps') => {
    if (type === 'fps') {
      if (value >= 60) return 'good';
      if (value >= 30) return 'warning';
      return 'critical';
    }
    if (type === 'temp') {
      if (value <= 70) return 'good';
      if (value <= 85) return 'warning';
      return 'critical';
    }
    if (type === 'usage') {
      if (value <= 80) return 'good';
      if (value <= 95) return 'warning';
      return 'critical';
    }
    return 'good';
  };

  // Get FPS from metrics
  const metricsFps: number = metrics?.fps?.current_fps ?? 0;
  const fps: number = metricsFps;

  const frametime = fps > 0 ? (1000 / fps).toFixed(1) : '0.0';
  const gpuUsage: number = metrics?.gpu_usage ?? 0;
  const gpuTemp: number = metrics?.gpu_temp_c ?? 0;
  const cpuUsage: number = metrics?.cpu_usage ?? 0;
  const cpuTemp: number = metrics?.cpu_temp_c ?? 0;
  const ramUsedGB: number = metrics?.ram_used_gb ?? 0;
  const ramTotalGB: number = metrics?.ram_total_gb ?? 16; // Default 16GB
  const ramPercent = ramTotalGB > 0 ? ((ramUsedGB / ramTotalGB) * 100).toFixed(0) : '0';

  return (
    <div className="performance-pip">
      <div className="pip-content">
        {/* FPS */}
        <div className="metric">
          <span className="label">FPS</span>
          <span className={`value ${getColor(fps, 'fps')}`}>{fps.toFixed(0)}</span>
        </div>

        <div className="separator">|</div>

        {/* Frametime */}
        <div className="metric">
          <span className="label">ms</span>
          <span className="value">{frametime}</span>
        </div>

        <div className="separator">|</div>

        {/* GPU */}
        <div className="metric">
          <span className="label">GPU</span>
          <span className={`value ${getColor(gpuUsage, 'usage')}`}>{gpuUsage.toFixed(0)}%</span>
          <span className={`temp ${getColor(gpuTemp, 'temp')}`}>{gpuTemp.toFixed(0)}°</span>
        </div>

        <div className="separator">|</div>

        {/* CPU */}
        <div className="metric">
          <span className="label">CPU</span>
          <span className={`value ${getColor(cpuUsage, 'usage')}`}>{cpuUsage.toFixed(0)}%</span>
          <span className={`temp ${getColor(cpuTemp, 'temp')}`}>{cpuTemp.toFixed(0)}°</span>
        </div>

        <div className="separator">|</div>

        {/* RAM */}
        <div className="metric">
          <span className="label">RAM</span>
          <span className="value">{ramUsedGB.toFixed(1)}GB</span>
          <span className="percent">({ramPercent}%)</span>
        </div>
      </div>
    </div>
  );
};
