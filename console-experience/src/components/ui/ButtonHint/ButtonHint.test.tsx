import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ButtonHint from './ButtonHint';

describe('ButtonHint Component', () => {
  it('renders XBOX button for CONFIRM action', () => {
    render(<ButtonHint action="CONFIRM" type="XBOX" label="Select" />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
  });

  it('renders PlayStation button for CONFIRM action', () => {
    render(<ButtonHint action="CONFIRM" type="PLAYSTATION" label="Select" />);
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('renders Switch button for CONFIRM action', () => {
    render(<ButtonHint action="CONFIRM" type="SWITCH" label="Select" />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders keyboard key for CONFIRM action', () => {
    render(<ButtonHint action="CONFIRM" type="KEYBOARD" label="Select" />);
    expect(screen.getByText('Enter')).toBeInTheDocument();
  });

  it('renders BACK button correctly', () => {
    render(<ButtonHint action="BACK" type="XBOX" label="Back" />);
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders MENU button correctly', () => {
    render(<ButtonHint action="MENU" type="XBOX" label="Menu" />);
    expect(screen.getByText('≡')).toBeInTheDocument();
  });

  it('renders D-Pad hints', () => {
    render(<ButtonHint action="DPAD_VERTICAL" type="XBOX" label="Navigate" />);
    expect(screen.getByText('D-Pad ↕')).toBeInTheDocument();
  });

  it('renders arrow keys', () => {
    render(<ButtonHint action="UP" type="GENERIC" label="Up" />);
    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('renders without label', () => {
    const { container } = render(<ButtonHint action="CONFIRM" type="XBOX" />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(container.querySelector('.button-hint-label')).not.toBeInTheDocument();
  });
});
