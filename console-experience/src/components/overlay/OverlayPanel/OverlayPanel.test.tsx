/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-non-null-assertion */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OverlayPanel } from './OverlayPanel';

describe('OverlayPanel Component', () => {
  it('renders when isOpen is true', () => {
    render(
      <OverlayPanel isOpen={true} onClose={() => {}} title="Test Panel">
        <div>Panel Content</div>
      </OverlayPanel>
    );
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <OverlayPanel isOpen={false} onClose={() => {}} title="Test Panel">
        <div>Panel Content</div>
      </OverlayPanel>
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <OverlayPanel isOpen={true} onClose={handleClose} title="Test Panel">
        <div>Panel Content</div>
      </OverlayPanel>
    );

    const backdrop = container.querySelector('.overlay-panel-backdrop');
    backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <OverlayPanel isOpen={true} onClose={handleClose} title="Test Panel">
        <div>Panel Content</div>
      </OverlayPanel>
    );

    const closeButton = screen.getByLabelText('Close');
    closeButton.click();
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies correct side class', () => {
    const { container } = render(
      <OverlayPanel isOpen={true} onClose={() => {}} title="Test Panel" side="right">
        <div>Panel Content</div>
      </OverlayPanel>
    );
    expect(container.querySelector('.overlay-panel-right')).toBeInTheDocument();
  });

  it('applies custom width style', () => {
    const { container } = render(
      <OverlayPanel isOpen={true} onClose={() => {}} title="Test Panel" width="600px">
        <div>Panel Content</div>
      </OverlayPanel>
    );
    const panel = container.querySelector('.overlay-panel')!;
    expect(panel).toHaveStyle({ width: '600px' });
  });

  it('renders custom footer when provided', () => {
    render(
      <OverlayPanel
        isOpen={true}
        onClose={() => {}}
        title="Test Panel"
        footer={<div>Custom Footer</div>}
      >
        <div>Panel Content</div>
      </OverlayPanel>
    );
    expect(screen.getByText('Custom Footer')).toBeInTheDocument();
  });

  it('renders custom header when provided', () => {
    render(
      <OverlayPanel
        isOpen={true}
        onClose={() => {}}
        title="Test Panel"
        header={<div>Custom Header</div>}
      >
        <div>Panel Content</div>
      </OverlayPanel>
    );
    expect(screen.getByText('Custom Header')).toBeInTheDocument();
    expect(screen.queryByText('Test Panel')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <OverlayPanel isOpen={true} onClose={() => {}} title="Test Panel" className="custom-panel">
        <div>Panel Content</div>
      </OverlayPanel>
    );
    expect(container.querySelector('.custom-panel')).toBeInTheDocument();
  });
});
