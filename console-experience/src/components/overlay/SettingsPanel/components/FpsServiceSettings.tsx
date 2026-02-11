import './FpsServiceSettings.css';

import React from 'react';

import { useFpsService } from '../../../../hooks/useFpsService';
import { SettingsItem } from './shared';

export const FpsServiceSettings: React.FC = () => {
  const { status, loading, error, install, uninstall, start, stop, refresh } = useFpsService();

  if (!status) {
    return <div className="fps-service-settings">Loading...</div>;
  }

  return (
    <div className="fps-service-settings">
      {/* Service Status */}
      <SettingsItem
        label="FPS Monitoring Service"
        description={
          status.installed
            ? 'Background service for accurate FPS monitoring (ETW-based)'
            : 'Install to enable system-wide FPS monitoring'
        }
      >
        <div className="fps-service-status">
          <div className="status-badges">
            <span className={`badge ${status.installed ? 'badge-success' : 'badge-warning'}`}>
              {status.installed ? '✓ Installed' : '⚠ Not Installed'}
            </span>
            {status.installed ? (
              <span className={`badge ${status.running ? 'badge-success' : 'badge-neutral'}`}>
                {status.running ? '▶ Running' : '⏸ Stopped'}
              </span>
            ) : null}
          </div>
        </div>
      </SettingsItem>

      {/* Action Buttons */}
      <SettingsItem label="Service Actions" description="Manage the FPS monitoring service">
        <div className="service-actions">
          {!status.installed ? (
            <button className="btn btn-primary" onClick={() => void install()} disabled={loading}>
              {loading ? 'Installing...' : '📦 Install Service'}
            </button>
          ) : (
            <div className="installed-actions">
              {!status.running ? (
                <button className="btn btn-success" onClick={() => void start()} disabled={loading}>
                  {loading ? 'Starting...' : '▶ Start Service'}
                </button>
              ) : (
                <button className="btn btn-warning" onClick={() => void stop()} disabled={loading}>
                  {loading ? 'Stopping...' : '⏸ Stop Service'}
                </button>
              )}
              <button className="btn btn-neutral" onClick={() => void refresh()} disabled={loading}>
                🔄 Refresh
              </button>
              <button
                className="btn btn-danger"
                onClick={() => void uninstall()}
                disabled={loading}
              >
                {loading ? 'Uninstalling...' : '🗑 Uninstall'}
              </button>
            </div>
          )}
        </div>
      </SettingsItem>

      {/* Admin Warning */}
      {!status.installed && (
        <SettingsItem
          label="⚠️ Administrator Required"
          description="Installing/uninstalling the service requires administrator privileges. You'll be prompted for UAC elevation."
        >
          <div className="admin-warning">
            <span className="warning-icon">⚠️</span>
          </div>
        </SettingsItem>
      )}

      {/* Error Display */}
      {error ? (
        <SettingsItem label="Error" description={error}>
          <div className="error-display">
            <span className="error-icon">❌</span>
          </div>
        </SettingsItem>
      ) : null}

      {/* Info Section */}
      <SettingsItem
        label="How it works"
        description="The FPS service uses Windows ETW (Event Tracing) to monitor DirectX frame presentations. It works with all games (Steam, Epic, GOG, etc.) and has zero performance impact."
      >
        <div className="info-section">
          <ul className="feature-list">
            <li>✓ Vendor-agnostic (Steam, Epic, GOG, etc.)</li>
            <li>✓ 98-99% game compatibility</li>
            <li>✓ Zero FPS impact</li>
            <li>✓ Works as Explorer.exe replacement</li>
          </ul>
        </div>
      </SettingsItem>
    </div>
  );
};
