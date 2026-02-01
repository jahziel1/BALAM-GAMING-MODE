import './Slider.css';

import React from 'react';

import { SelectableItem } from '../SelectableItem/SelectableItem';

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  icon?: string;
  unit?: string;
  isFocused?: boolean;
  disabled?: boolean;
}

/**
 * Reusable slider component with gamepad and mouse support.
 * Follows KISS principle: Simple, functional, performant.
 */
export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  icon,
  unit = '',
  isFocused = false,
  disabled = false,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange(Number(e.target.value));
    }
  };

  return (
    <SelectableItem isFocused={isFocused} disabled={disabled} className="slider-item">
      <div className="slider-content">
        <div className="slider-header">
          {icon ? <span className="slider-icon">{icon}</span> : null}
          <span className="slider-label">{label}</span>
          <span className="slider-value">
            {value}
            {unit}
          </span>
        </div>

        <div className="slider-track-container">
          <div className="slider-track">
            <div className="slider-fill" style={{ width: `${percentage}%` }} />
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={handleMouseChange}
              disabled={disabled}
              className="slider-input"
              aria-label={label}
            />
          </div>
        </div>
      </div>
    </SelectableItem>
  );
};
