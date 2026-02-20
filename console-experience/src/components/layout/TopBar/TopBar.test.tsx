import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TopBar from './TopBar';

// Mock Tauri event API so TopBar's volume-changed listener doesn't crash in jsdom
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

describe('TopBar Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders clock and user info', () => {
    render(<TopBar />);
    expect(screen.getByText('DIABLO')).toBeInTheDocument();
    // Clock will be rendered, checking for element presence
    expect(screen.getByTestId('clock')).toBeInTheDocument();
  });

  it('updates time periodically', () => {
    render(<TopBar />);
    const initialTime = screen.getByTestId('clock').textContent;

    act(() => {
      vi.advanceTimersByTime(60000); // Advance 1 minute
    });

    const newTime = screen.getByTestId('clock').textContent;
    expect(newTime).not.toBe(initialTime);
  });
});
