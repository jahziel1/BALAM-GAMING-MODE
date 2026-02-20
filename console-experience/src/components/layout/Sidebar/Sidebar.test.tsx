import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  const mockOnToggle = vi.fn();
  const mockOnAction = vi.fn();

  it('renders collapsed by default', () => {
    render(<Sidebar isOpen={false} onToggle={mockOnToggle} onAction={mockOnAction} />);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).not.toHaveClass('expanded');
  });

  it('renders expanded when isOpen is true', () => {
    render(<Sidebar isOpen={true} onToggle={mockOnToggle} onAction={mockOnAction} />);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveClass('expanded');
  });

  it('renders all menu items', () => {
    render(<Sidebar isOpen={true} onToggle={mockOnToggle} onAction={mockOnAction} />);
    expect(screen.getByText('INICIO')).toBeInTheDocument();
    expect(screen.getByText('BIBLIOTECA')).toBeInTheDocument();
    expect(screen.getByText('AJUSTES')).toBeInTheDocument();
  });
});
