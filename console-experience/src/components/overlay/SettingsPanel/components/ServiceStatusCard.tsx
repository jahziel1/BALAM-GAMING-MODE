import './ServiceStatusCard.css';

import React from 'react';

import { useFpsServiceManager } from '../../../../hooks/useFpsServiceManager';

/**
 * Service Status Card Component
 *
 * Displays FPS monitoring service status and provides controls
 * for installation and management. Uses native Windows Service APIs.
 * Optimized with React.memo.
 */
export const ServiceStatusCard: React.FC = React.memo(() => {
  const { status, loading, error, install, uninstall, start, stop, refresh } =
    useFpsServiceManager();

  if (!status) {
    return (
      <div className="service-status-card">
        <div className="service-loading">
          <span className="loading-spinner"></span>
          <span>Loading service status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="service-status-card">
      <div className="service-header">
        <div className="service-title">
          <h4>FPS Monitoring Service</h4>
          {status.version ? <span className="service-version">v{status.version}</span> : null}
        </div>
        <button
          className="refresh-button"
          onClick={() => void refresh()}
          disabled={loading}
          title="Refresh service status"
        >
          🔄
        </button>
      </div>

      <div className="service-status">
        <div className="status-row">
          <span className="status-label">Installation:</span>
          <span className={`status-badge ${status.installed ? 'success' : 'warning'}`}>
            {status.installed ? '✓ Installed' : '⚠ Not Installed'}
          </span>
        </div>
        {status.installed ? (
          <div className="status-row">
            <span className="status-label">Service:</span>
            <span className={`status-badge ${status.running ? 'success' : 'neutral'}`}>
              {status.running ? '▶ Running' : '⏸ Stopped'}
            </span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="service-error">
          <span className="error-icon">❌</span>
          <span className="error-message">{error}</span>
        </div>
      ) : null}

      <div className="service-description">
        <p>
          Uses Windows Event Tracing (ETW) for accurate FPS measurement in DirectX games. Works
          vendor-agnostic (Steam, Epic, GOG, etc.).
        </p>
      </div>

      <div className="service-actions">
        {!status.installed ? (
          <>
            <button
              className="action-button primary"
              onClick={() => void install()}
              disabled={loading}
            >
              {loading ? '⏳ Installing...' : '📦 Install Service'}
            </button>
            <div className="uac-warning">
              <span className="warning-icon">⚠️</span>
              <span>Requires administrator privileges (UAC prompt will appear)</span>
            </div>
          </>
        ) : (
          <div className="installed-actions">
            {!status.running ? (
              <button
                className="action-button success"
                onClick={() => void start()}
                disabled={loading}
              >
                {loading ? '⏳ Starting...' : '▶ Start Service'}
              </button>
            ) : (
              <button
                className="action-button warning"
                onClick={() => void stop()}
                disabled={loading}
              >
                {loading ? '⏳ Stopping...' : '⏸ Stop Service'}
              </button>
            )}
            <button
              className="action-button danger"
              onClick={() => void uninstall()}
              disabled={loading}
            >
              {loading ? '⏳ Uninstalling...' : '🗑 Uninstall'}
            </button>
          </div>
        )}
      </div>

      <div className="service-features">
        <h5>Features:</h5>
        <ul>
          <li>✅ DirectX 9/11/12 game support</li>
          <li>✅ Filters DWM and system processes</li>
          <li>✅ Multi-process FPS tracking</li>
          <li>✅ Native Windows Service (no scripts)</li>
          <li>⏳ Vulkan/OpenGL support (coming soon)</li>
        </ul>
      </div>
    </div>
  );
});

ServiceStatusCard.displayName = 'ServiceStatusCard';
