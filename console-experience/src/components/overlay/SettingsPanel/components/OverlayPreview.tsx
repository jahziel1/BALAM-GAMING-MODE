import './OverlayPreview.css';

import React from 'react';

interface OverlayPreviewProps {
  level: 0 | 1 | 2 | 3 | 4;
  opacity: number;
}

/**
 * Overlay Preview Component
 *
 * Shows a miniature preview of what the performance overlay will look like
 * based on the selected level and opacity settings.
 * Optimized with React.memo.
 */
export const OverlayPreview: React.FC<OverlayPreviewProps> = React.memo(({ level, opacity }) => {
  if (level === 0) {
    return (
      <div className="overlay-preview">
        <div className="preview-container empty">
          <p className="empty-message">Overlay Hidden</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay-preview">
      <div className="preview-label">Preview:</div>
      <div className="preview-container" style={{ opacity }}>
        <div className="preview-pip">
          {/* Level 1: FPS only */}
          {level >= 1 && (
            <div className="preview-row">
              <span className="fps-value">60 FPS</span>
            </div>
          )}

          {/* Level 2: + Frame time */}
          {level >= 2 && (
            <div className="preview-row">
              <span className="metric-value">16.7 ms</span>
            </div>
          )}

          {/* Level 3: + CPU/GPU usage */}
          {level >= 3 && (
            <>
              <div className="preview-row">
                <span className="metric-label">CPU:</span>
                <span className="metric-value">45%</span>
                <span className="metric-separator">|</span>
                <span className="metric-label">GPU:</span>
                <span className="metric-value">78%</span>
              </div>
            </>
          )}

          {/* Level 4: + Temps, RAM, GPU Power */}
          {level >= 4 && (
            <>
              <div className="preview-row">
                <span className="metric-label">CPU:</span>
                <span className="metric-value">45%</span>
                <span className="temp-value">(67°C)</span>
                <span className="metric-separator">|</span>
                <span className="metric-label">GPU:</span>
                <span className="metric-value">78%</span>
                <span className="temp-value">(72°C)</span>
              </div>
              <div className="preview-row">
                <span className="metric-label">RAM:</span>
                <span className="metric-value">8.2 / 16.0 GB</span>
                <span className="metric-separator">|</span>
                <span className="metric-label">GPU Power:</span>
                <span className="metric-value">120W</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

OverlayPreview.displayName = 'OverlayPreview';
