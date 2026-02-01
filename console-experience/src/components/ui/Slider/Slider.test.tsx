/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-non-null-assertion */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Slider } from './Slider';

describe('Slider Component', () => {
  it('renders slider with label', () => {
    render(<Slider label="Volume" value={50} min={0} max={100} onChange={() => {}} />);
    expect(screen.getByText('Volume')).toBeInTheDocument();
  });

  it('displays current value with unit', () => {
    render(<Slider label="Brightness" value={75} min={0} max={100} unit="%" onChange={() => {}} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('displays value without unit when not provided', () => {
    render(<Slider label="Level" value={42} min={0} max={100} onChange={() => {}} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('calls onChange when value changes', () => {
    const handleChange = vi.fn();
    const { container } = render(
      <Slider label="Volume" value={50} min={0} max={100} onChange={handleChange} />
    );

    const input = container.querySelector('input[type="range"]')!;
    // Create and dispatch a proper input event that React can catch
    const event = new Event('input', { bubbles: true });
    Object.defineProperty(input, 'value', { value: '75', writable: true });
    input.dispatchEvent(event);

    expect(handleChange).toHaveBeenCalledWith(75);
  });

  it('applies focused class when isFocused is true', () => {
    const { container } = render(
      <Slider label="Volume" value={50} min={0} max={100} isFocused={true} onChange={() => {}} />
    );

    expect(container.querySelector('.selectable-item.focused')).toBeInTheDocument();
  });

  it('disables slider when disabled prop is true', () => {
    const { container } = render(
      <Slider label="Volume" value={50} min={0} max={100} disabled={true} onChange={() => {}} />
    );

    const input = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(input.disabled).toBe(true);
  });

  it('renders with custom step value', () => {
    const { container } = render(
      <Slider label="Volume" value={50} min={0} max={100} step={5} onChange={() => {}} />
    );

    const input = container.querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(input.step).toBe('5');
  });

  it('calculates percentage correctly', () => {
    const { container } = render(
      <Slider label="Volume" value={50} min={0} max={100} onChange={() => {}} />
    );

    const fill = container.querySelector('.slider-fill')!;
    expect(fill).toHaveStyle({ width: '50%' });
  });
});
