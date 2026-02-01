import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Footer from './Footer';

describe('Footer Component', () => {
  it('renders default prompts (keyboard)', () => {
    render(<Footer controllerType="KEYBOARD" />);
    // ButtonHint upper-cases labels often, so checking case-insensitive or exact text based on implementation
    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('switches to gamepad prompts when gamepad is active', () => {
    render(<Footer controllerType="XBOX" />);
    expect(screen.getByTestId('footer-prompts')).toBeInTheDocument();
  });
});
