import './OverlayLevelSelector.css';

import React from 'react';

interface OverlayLevelSelectorProps {
  selectedLevel: 0 | 1 | 2 | 3 | 4;
  onLevelChange: (level: 0 | 1 | 2 | 3 | 4) => void;
}

interface LevelOption {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  description: string;
  metrics: string[];
}

const LEVEL_OPTIONS: LevelOption[] = [
  {
    level: 0,
    label: 'Hidden',
    description: 'Overlay completely hidden',
    metrics: [],
  },
  {
    level: 1,
    label: 'Minimal',
    description: 'FPS only',
    metrics: ['60 FPS'],
  },
  {
    level: 2,
    label: 'Basic',
    description: 'FPS + Frame time',
    metrics: ['60 FPS', '16.7 ms'],
  },
  {
    level: 3,
    label: 'Standard',
    description: 'FPS + Frame time + CPU/GPU usage',
    metrics: ['60 FPS', '16.7 ms', 'CPU: 45%', 'GPU: 78%'],
  },
  {
    level: 4,
    label: 'Full',
    description: 'All metrics (temps, RAM, GPU power)',
    metrics: ['60 FPS', '16.7 ms', 'CPU: 45% (67°C)', 'GPU: 78% (72°C)', 'RAM: 8.2/16.0 GB'],
  },
];

/**
 * Overlay Level Selector - Steam Deck Style
 *
 * Allows users to select performance overlay detail level (0-4).
 * Optimized with React.memo to prevent unnecessary re-renders.
 */
export const OverlayLevelSelector: React.FC<OverlayLevelSelectorProps> = React.memo(
  ({ selectedLevel, onLevelChange }) => {
    return (
      <div className="overlay-level-selector">
        <div className="level-options">
          {LEVEL_OPTIONS.map((option) => (
            <label
              key={option.level}
              className={`level-option ${selectedLevel === option.level ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="overlay-level"
                value={option.level}
                checked={selectedLevel === option.level}
                onChange={() => onLevelChange(option.level)}
              />
              <div className="level-content">
                <div className="level-header">
                  <span className="level-label">
                    Level {option.level}: {option.label}
                  </span>
                  <span className="level-badge">{option.level}</span>
                </div>
                <p className="level-description">{option.description}</p>
                {option.metrics.length > 0 && (
                  <div className="level-preview-metrics">
                    {option.metrics.map((metric, index) => (
                      <span key={index} className="metric-item">
                        {metric}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  }
);

OverlayLevelSelector.displayName = 'OverlayLevelSelector';
