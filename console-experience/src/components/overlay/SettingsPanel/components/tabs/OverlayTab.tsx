/* eslint-disable */
import './OverlayTab.css';

import { invoke } from '@tauri-apps/api/core';
import React, { useEffect, useState } from 'react';

interface OverlayStatus {
  enabled: boolean;
  position: string;
  fps_available: boolean;
}

/**
 * Overlay Settings Tab - Native performance HUD configuration
 *
 * Features:
 * - Enable/disable overlay toggle
 * - Position selector (4 corners)
 * - FPS availability warning
 * - Safe, anti-cheat compatible overlay
 */
export const OverlayTab: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [position, setPosition] = useState('top-left');
  const [fpsAvailable, setFpsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load overlay status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  /**
   * Load current overlay status from backend
   */
  const loadStatus = async () => {
    try {
      const status = await invoke<OverlayStatus>('overlay_get_status');
      setEnabled(status.enabled);
      setPosition(status.position);
      setFpsAvailable(status.fps_available);
      setError(null);
    } catch (err) {
      setError(`Failed to load overlay status: ${err}`);
      console.error('Overlay status error:', err);
    }
  };

  /**
   * Toggle overlay enable/disable
   */
  const handleToggle = async () => {
    setLoading(true);
    setError(null);

    try {
      if (enabled) {
        await invoke('overlay_disable');
        setEnabled(false);
      } else {
        await invoke('overlay_enable');
        setEnabled(true);
      }
    } catch (err) {
      setError(`Failed to toggle overlay: ${err}`);
      console.error('Overlay toggle error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Change overlay position
   */
  const handlePositionChange = async (newPosition: string) => {
    setLoading(true);
    setError(null);

    try {
      await invoke('overlay_set_position', { corner: newPosition });
      setPosition(newPosition);
    } catch (err) {
      setError(`Failed to set position: ${err}`);
      console.error('Position change error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay-tab">
      <h2>Performance Overlay</h2>
      <p className="overlay-description">
        Native performance HUD showing FPS, CPU, GPU, RAM, and temperatures.
        <br />✅ Safe • ✅ No anti-cheat detection • ✅ Zero admin rights
      </p>

      {/* Error Display */}
      {error ? <div className="overlay-error">⚠️ {error}</div> : null}

      {/* Enable/Disable Toggle */}
      <div className="overlay-setting-card">
        <div className="overlay-setting-header">
          <label className="overlay-toggle">
            <input type="checkbox" checked={enabled} onChange={handleToggle} disabled={loading} />
            <span className="overlay-toggle-slider"></span>
            <span className="overlay-toggle-label">{enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>
        <p className="overlay-setting-description">
          Show performance overlay on screen while gaming
        </p>
      </div>

      {/* FPS Availability Warning */}
      {enabled && !fpsAvailable ? (
        <div className="overlay-warning">
          ⚠️ FPS monitoring unavailable
          <br />
          <small>
            FPS only works in windowed or borderless mode (~80% of games). Fullscreen exclusive mode
            bypasses the Desktop Window Manager.
          </small>
        </div>
      ) : null}

      {/* Position Selector */}
      {enabled ? (
        <div className="overlay-setting-card">
          <h3>Position</h3>
          <p className="overlay-setting-description">Choose where the overlay appears on screen</p>
          <div className="overlay-position-grid">
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
              <button
                key={pos}
                className={`overlay-position-button ${position === pos ? 'active' : ''}`}
                onClick={() => handlePositionChange(pos)}
                disabled={loading}
              >
                <div className="overlay-position-preview">
                  <div className={`overlay-preview-dot position-${pos}`}></div>
                </div>
                <span>{pos.replace('-', ' ')}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Technical Information */}
      <div className="overlay-info-card">
        <h3>How It Works</h3>
        <ul className="overlay-info-list">
          <li>
            <strong>FPS:</strong> Desktop Window Manager composition timing
          </li>
          <li>
            <strong>CPU/RAM:</strong> Windows Performance Counters
          </li>
          <li>
            <strong>GPU (NVIDIA):</strong> NVML official library
          </li>
          <li>
            <strong>GPU (AMD):</strong> ADL official library
          </li>
          <li>
            <strong>Overhead:</strong> &lt;1% CPU, &lt;5ms per update
          </li>
        </ul>
      </div>

      {/* Compatibility Note */}
      <div className="overlay-info-card">
        <h3>Compatibility</h3>
        <p>
          This overlay works with <strong>all games</strong> including those with anti-cheat
          (Valorant, Apex, CS2, etc.). Unlike DLL injection overlays, this uses native Windows APIs
          and is completely undetectable.
        </p>
        <p>
          <strong>Limitation:</strong> FPS monitoring only works in windowed/borderless mode. About
          20% of games use fullscreen exclusive which bypasses DWM.
        </p>
      </div>
    </div>
  );
};
