/**
 * Radix UI Slider Component
 *
 * Modern, accessible slider using @radix-ui/react-slider primitives.
 * Provides production-grade accessibility and keyboard/gamepad support.
 *
 * ## Architecture
 * - **UI Primitive**: @radix-ui/react-slider (headless accessible component)
 * - **Container**: SelectableItem for consistent focus states
 * - **Performance**: Memoized to prevent unnecessary re-renders
 *
 * ## Features
 * - **Keyboard/Gamepad**: Arrow keys to adjust value, Page Up/Down for large steps
 * - **Mouse/Touch**: Click track to jump, drag thumb to adjust
 * - **Accessibility**: ARIA labels, screen reader announcements, keyboard focus
 * - **Visual Feedback**: Focus state via SelectableItem, disabled state styling
 * - **Controlled Component**: Value managed by parent component
 *
 * ## Radix Slider Benefits
 * - Automatic ARIA attributes (role, aria-valuemin, aria-valuemax, aria-valuenow)
 * - Keyboard navigation (Arrow keys, Home, End, Page Up/Down)
 * - RTL support out of the box
 * - Touch/pointer friendly (mobile support)
 * - Disabled state handling
 *
 * ## Example Usage
 * ```tsx
 * <RadixSlider
 *   label="Volume"
 *   value={volume}
 *   min={0}
 *   max={100}
 *   step={5}
 *   onChange={(val) => setVolume(val)}
 *   icon="🔊"
 *   unit="%"
 *   isFocused={focusedIndex === 0}
 * />
 * ```
 *
 * @module components/ui/RadixSlider
 */

import './RadixSlider.css';

import * as RadixSliderPrimitive from '@radix-ui/react-slider';
import React, { memo } from 'react';

import { SelectableItem } from '../SelectableItem/SelectableItem';

/**
 * Props for RadixSlider component
 */
export interface RadixSliderProps {
  /** Label text displayed above the slider */
  label: string;

  /** Current slider value */
  value: number;

  /** Minimum allowed value */
  min: number;

  /** Maximum allowed value */
  max: number;

  /**
   * Step increment for slider changes
   * @default 1
   */
  step?: number;

  /**
   * Callback when value changes
   * @param value - New slider value
   */
  onChange: (value: number) => void;

  /**
   * Optional icon/emoji shown before label
   * @example "🔊" for volume, "☀️" for brightness
   */
  icon?: string;

  /**
   * Unit suffix shown after value
   * @example "%" for percentage, "ms" for milliseconds
   * @default ""
   */
  unit?: string;

  /**
   * Whether this slider is currently focused
   * Controls SelectableItem focus state
   * @default false
   */
  isFocused?: boolean;

  /**
   * Whether the slider is disabled
   * Prevents user interaction
   * @default false
   */
  disabled?: boolean;
}

/**
 * RadixSlider Component
 *
 * Accessible slider with keyboard, gamepad, and mouse support.
 * Wraps Radix UI Slider primitive with custom styling and SelectableItem focus management.
 *
 * @param props - Component props
 * @returns Slider with label, value display, and interactive track
 */
export const RadixSlider: React.FC<RadixSliderProps> = memo(
  ({
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
    /**
     * Value change handler
     *
     * Radix Slider uses array format for values (to support range sliders).
     * We extract the first value and pass it to onChange callback.
     *
     * Ignored when disabled === true.
     *
     * @param values - Array of slider values ([value] for single slider)
     */
    const handleValueChange = (values: number[]) => {
      if (!disabled && values[0] !== undefined) {
        onChange(values[0]);
      }
    };

    return (
      <SelectableItem isFocused={isFocused} disabled={disabled} className="radix-slider-item">
        <div className="radix-slider-content">
          <div className="radix-slider-header">
            {icon ? <span className="radix-slider-icon">{icon}</span> : null}
            <span className="radix-slider-label">{label}</span>
            <span className="radix-slider-value">
              {value}
              {unit}
            </span>
          </div>

          <RadixSliderPrimitive.Root
            className="radix-slider-root"
            value={[value]}
            onValueChange={handleValueChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            aria-label={label}
          >
            <RadixSliderPrimitive.Track className="radix-slider-track">
              <RadixSliderPrimitive.Range className="radix-slider-range" />
            </RadixSliderPrimitive.Track>
            <RadixSliderPrimitive.Thumb className="radix-slider-thumb" />
          </RadixSliderPrimitive.Root>
        </div>
      </SelectableItem>
    );
  }
);

RadixSlider.displayName = 'RadixSlider';
