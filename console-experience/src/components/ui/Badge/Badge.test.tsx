import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Badge from './Badge';

describe('Badge Component', () => {
  it('renders the label correctly', () => {
    render(<Badge label="RPG" />);
    expect(screen.getByText('RPG')).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    const { container } = render(<Badge label="Action" variant="outline" />);
    expect(container.firstChild).toHaveClass('badge-outline');
  });
});
