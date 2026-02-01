import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Card from './Card';

describe('Card Component', () => {
  const mockProps = {
    title: 'Cyberpunk 2077',
    image: '/cyberpunk.jpg',
  };

  it('renders title and image correctly', () => {
    render(<Card {...mockProps} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', mockProps.image);
    expect(screen.getByRole('img')).toHaveAttribute('alt', mockProps.title);
  });

  it('applies focused class when isFocused prop is true', () => {
    const { container } = render(<Card {...mockProps} isFocused={true} />);
    expect(container.firstChild).toHaveClass('focused');
  });

  it('does not have focused class by default', () => {
    const { container } = render(<Card {...mockProps} />);
    expect(container.firstChild).not.toHaveClass('focused');
  });
});
