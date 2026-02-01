/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SystemOSD from './SystemOSD';

describe('SystemOSD Component', () => {
  it('renders volume OSD with correct value', () => {
    render(<SystemOSD type="volume" value={50} isVisible={true} />);
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders brightness OSD with correct value', () => {
    render(<SystemOSD type="brightness" value={75} isVisible={true} />);
    expect(screen.getByText('Brightness')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    const { container } = render(<SystemOSD type="volume" value={50} isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders muted icon when volume is 0', () => {
    const { container } = render(<SystemOSD type="volume" value={0} isVisible={true} />);
    expect(container.querySelector('.osd-icon')).toBeInTheDocument();
  });

  it('applies exit animation class when hiding', () => {
    const { rerender, container } = render(<SystemOSD type="volume" value={50} isVisible={true} />);
    expect(container.querySelector('.osd-container')).not.toHaveClass('osd-exit');

    rerender(<SystemOSD type="volume" value={50} isVisible={false} />);
    expect(container.querySelector('.osd-container')).toHaveClass('osd-exit');
  });

  it('renders fill bar with correct width', () => {
    const { container } = render(<SystemOSD type="volume" value={33} isVisible={true} />);
    const fillBar = container.querySelector('.osd-fill')!;
    expect(fillBar).toHaveStyle({ width: '33%' });
  });
});
