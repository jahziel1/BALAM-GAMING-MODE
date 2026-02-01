/* eslint-disable @typescript-eslint/no-empty-function */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import VirtualKeyboard from './VirtualKeyboard';

// Mock the keyboard navigation hook
vi.mock('./useKeyboardNavigation', () => ({
  useKeyboardNavigation: vi.fn(() => ({
    text: 'test',
    setText: vi.fn(),
    shift: false,
    capsLock: false,
    layoutMode: 'qwerty' as const,
    currentLayout: [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACK'],
      ['SPACE', 'ENTER', 'SYMBOLS'],
    ],
    focusedRow: 0,
    focusedCol: 0,
    lastPressedKey: null,
    pressAnimation: false,
    handleKeyPress: vi.fn(),
    clearText: vi.fn(),
  })),
}));

// Mock layouts
vi.mock('./layouts', () => ({
  getDisplayKey: (key: string) => {
    if (key === 'SHIFT') return '⇧';
    if (key === 'BACK') return '⌫';
    if (key === 'SPACE') return 'Space';
    if (key === 'ENTER') return '↵ Done';
    if (key === 'SYMBOLS') return '#+=';
    if (key === 'CAPS') return '⇪';
    return key;
  },
  isSpecialKey: (key: string) =>
    ['SHIFT', 'BACK', 'SPACE', 'ENTER', 'SYMBOLS', 'CAPS', 'QWERTY'].includes(key),
}));

describe('VirtualKeyboard Component', () => {
  it('renders when isOpen is true', () => {
    render(<VirtualKeyboard isOpen={true} onClose={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText('Typing:')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <VirtualKeyboard isOpen={false} onClose={() => {}} onSubmit={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays current text', () => {
    render(<VirtualKeyboard isOpen={true} onClose={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('displays placeholder when text is empty', async () => {
    const { useKeyboardNavigation } = await import('./useKeyboardNavigation');
    vi.mocked(useKeyboardNavigation).mockReturnValueOnce({
      text: '',
      setText: vi.fn(),
      shift: false,
      capsLock: false,
      layoutMode: 'qwerty' as const,
      currentLayout: [['q']],
      focusedRow: 0,
      focusedCol: 0,
      lastPressedKey: null,
      pressAnimation: false,
      handleKeyPress: vi.fn(),
      clearText: vi.fn(),
    });

    render(
      <VirtualKeyboard
        isOpen={true}
        onClose={() => {}}
        onSubmit={() => {}}
        placeholder="Enter text here"
      />
    );
    expect(screen.getByText('Enter text here')).toBeInTheDocument();
  });

  it('renders keyboard layout', () => {
    render(<VirtualKeyboard isOpen={true} onClose={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText('q')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('⇧')).toBeInTheDocument();
  });

  it('renders special keys with correct labels', () => {
    render(<VirtualKeyboard isOpen={true} onClose={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText('⇧')).toBeInTheDocument(); // SHIFT
    expect(screen.getByText('⌫')).toBeInTheDocument(); // BACK
    expect(screen.getByText('Space')).toBeInTheDocument();
    expect(screen.getByText('↵ Done')).toBeInTheDocument(); // ENTER
    expect(screen.getByText('#+=')).toBeInTheDocument(); // SYMBOLS
  });

  it('calls handleKeyPress when key is clicked', async () => {
    const { useKeyboardNavigation } = await import('./useKeyboardNavigation');
    const mockHandleKeyPress = vi.fn();
    vi.mocked(useKeyboardNavigation).mockReturnValueOnce({
      text: '',
      setText: vi.fn(),
      shift: false,
      capsLock: false,
      layoutMode: 'qwerty' as const,
      currentLayout: [['q']],
      focusedRow: 0,
      focusedCol: 0,
      lastPressedKey: null,
      pressAnimation: false,
      handleKeyPress: mockHandleKeyPress,
      clearText: vi.fn(),
    });

    render(<VirtualKeyboard isOpen={true} onClose={() => {}} onSubmit={() => {}} />);

    const qKey = screen.getByText('q');
    qKey.click();
    expect(mockHandleKeyPress).toHaveBeenCalledWith('q');
  });

  it('renders close button', () => {
    render(<VirtualKeyboard isOpen={true} onClose={() => {}} onSubmit={() => {}} />);
    const closeButton = screen.getByText(/Close \(ESC\)/i);
    expect(closeButton).toBeInTheDocument();
  });
});
