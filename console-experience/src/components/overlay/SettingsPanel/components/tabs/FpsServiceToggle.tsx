import './FpsServiceToggle.css';

import React, { useState } from 'react';

import { useFpsService } from '../../../../../hooks/useFpsService';
import { useToast } from '../../../../../hooks/useToast';

/**
 * FPS Service Toggle Component
 *
 * Allows users to enable/disable real-time FPS monitoring service.
 * Handles admin privilege requirements gracefully.
 */
export const FpsServiceToggle: React.FC = () => {
  const { status, loading, error, requiresAdmin, toggle } = useFpsService();
  const toast = useToast();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsToggling(true);
    try {
      await toggle(checked);

      if (checked) {
        toast.success('FPS Monitoring Enabled', 'Service started successfully', 3000);
      } else {
        toast.info('FPS Monitoring Disabled', 'Service stopped', 3000);
      }
    } catch {
      // Error handled by toast notifications
      if (requiresAdmin) {
        toast.error(
          'Administrator Required',
          'Please run Balam as Administrator to enable FPS monitoring',
          5000
        );
      } else {
        toast.error('Failed to Toggle Service', error ?? 'An unknown error occurred', 5000);
      }
    } finally {
      setIsToggling(false);
    }
  };

  const isEnabled = status?.running ?? false;
  const isInstalled = status?.installed ?? false;

  return (
    <div className="fps-service-toggle">
      <div className="fps-service-header">
        <div className="fps-service-title">
          <h3>Real-Time FPS Tracking</h3>
          {status?.version ? <span className="fps-service-version">v{status.version}</span> : null}
        </div>

        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => void handleToggle(e.target.checked)}
            disabled={loading || isToggling}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      <div className="fps-service-description">
        <p>
          Uses Windows Event Tracing (ETW) for accurate FPS measurement in DirectX games. Filters
          out system processes like DWM for precise game FPS.
        </p>
      </div>

      {requiresAdmin ? (
        <div className="fps-service-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-text">
            <strong>Administrator privileges required</strong>
            <p>Please run Balam as Administrator to enable FPS monitoring service.</p>
          </div>
        </div>
      ) : null}

      {error && !requiresAdmin ? (
        <div className="fps-service-error">
          <div className="error-icon">❌</div>
          <div className="error-text">{error}</div>
        </div>
      ) : null}

      <div className="fps-service-status">
        <div className="status-item">
          <span className="status-label">Service Status:</span>
          <span className={`status-badge ${isInstalled ? 'installed' : 'not-installed'}`}>
            {isInstalled ? 'Installed' : 'Not Installed'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Monitoring:</span>
          <span className={`status-badge ${isEnabled ? 'active' : 'inactive'}`}>
            {isEnabled ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="fps-service-features">
        <h4>Features:</h4>
        <ul>
          <li>✅ DirectX 9/11/12 game support</li>
          <li>✅ Filters DWM and system processes</li>
          <li>✅ Multi-process FPS tracking</li>
          <li>✅ 10-240 FPS range (ignores unrealistic values)</li>
          <li>⏳ Vulkan/OpenGL support (coming soon)</li>
        </ul>
      </div>

      {loading || isToggling ? (
        <div className="fps-service-loading">
          <div className="loading-spinner"></div>
          <span>{isToggling ? (isEnabled ? 'Disabling...' : 'Enabling...') : 'Loading...'}</span>
        </div>
      ) : null}
    </div>
  );
};
