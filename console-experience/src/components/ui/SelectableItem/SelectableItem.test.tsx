import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SelectableItem } from './SelectableItem';

describe('SelectableItem Component', () => {
  it('renders children correctly', () => {
    render(
      <SelectableItem>
        <span>Test Content</span>
      </SelectableItem>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies focused class when isFocused is true', () => {
    const { container } = render(
      <SelectableItem isFocused={true}>
        <span>Content</span>
      </SelectableItem>
    );
    expect(container.querySelector('.focused')).toBeInTheDocument();
  });

  it('applies disabled class when disabled is true', () => {
    const { container } = render(
      <SelectableItem disabled={true}>
        <span>Content</span>
      </SelectableItem>
    );
    expect(container.querySelector('.disabled')).toBeInTheDocument();
  });

  it('calls onClick when clicked and not disabled', () => {
    const handleClick = vi.fn();
    render(
      <SelectableItem onClick={handleClick}>
        <span>Content</span>
      </SelectableItem>
    );

    const item = screen.getByRole('button');
    item.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <SelectableItem onClick={handleClick} disabled={true}>
        <span>Content</span>
      </SelectableItem>
    );

    const item = screen.getByRole('button');
    item.click();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SelectableItem className="custom-class">
        <span>Content</span>
      </SelectableItem>
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('applies variant class', () => {
    const { container } = render(
      <SelectableItem variant="danger">
        <span>Content</span>
      </SelectableItem>
    );
    expect(container.querySelector('.danger')).toBeInTheDocument();
  });

  it('has correct tabIndex when not disabled', () => {
    render(
      <SelectableItem>
        <span>Content</span>
      </SelectableItem>
    );
    const item = screen.getByRole('button');
    expect(item).toHaveAttribute('tabIndex', '0');
  });

  it('has tabIndex -1 when disabled', () => {
    render(
      <SelectableItem disabled={true}>
        <span>Content</span>
      </SelectableItem>
    );
    const item = screen.getByRole('button');
    expect(item).toHaveAttribute('tabIndex', '-1');
  });
});
