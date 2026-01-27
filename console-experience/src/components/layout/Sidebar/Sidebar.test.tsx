import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';

describe('Sidebar Component', () => {
  it('renders collapsed by default', () => {
    render(<Sidebar isOpen={false} onToggle={() => {}} />);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).not.toHaveClass('expanded');
  });

  it('renders expanded when isOpen is true', () => {
    render(<Sidebar isOpen={true} onToggle={() => {}} />);
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveClass('expanded');
  });

  it('renders all menu items', () => {
    render(<Sidebar isOpen={true} onToggle={() => {}} />);
    expect(screen.getByText('INICIO')).toBeInTheDocument();
    expect(screen.getByText('BIBLIOTECA')).toBeInTheDocument();
    expect(screen.getByText('AJUSTES')).toBeInTheDocument();
  });

  it('highlights the active item', () => {
    render(<Sidebar isOpen={true} activeIndex={1} onToggle={() => {}} />);
    const libraryItem = screen.getByText('BIBLIOTECA').closest('.menu-item');
    expect(libraryItem).toHaveClass('focused');
  });
});