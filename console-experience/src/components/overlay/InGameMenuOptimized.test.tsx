/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InGameMenuOptimized } from './InGameMenuOptimized';

// Mock Zustand stores
vi.mock('@/application/providers/StoreProvider', () => ({
  useGameStore: vi.fn(() => ({
    activeRunningGame: {
      game: { id: '1', title: 'Test Game' },
      pid: 1234,
    },
    killGame: vi.fn(),
  })),
}));

vi.mock('@/application/stores/overlay-store', () => ({
  useOverlayStore: vi.fn(() => ({
    currentOverlay: 'inGameMenu',
    hideOverlay: vi.fn(),
    showOverlay: vi.fn(),
  })),
}));

describe('InGameMenuOptimized Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when overlay is open', () => {
    render(<InGameMenuOptimized />);
    expect(screen.getByText('Resume Game')).toBeInTheDocument();
    expect(screen.getByText('Quick Settings')).toBeInTheDocument();
    expect(screen.getByText('Quit Game')).toBeInTheDocument();
  });

  it('displays active game title', () => {
    render(<InGameMenuOptimized />);
    expect(screen.getByText('Test Game')).toBeInTheDocument();
  });

  it('displays fallback title when no game is running', async () => {
    const { useGameStore } = await import('@/application/providers/StoreProvider');
    vi.mocked(useGameStore).mockReturnValue({
      activeRunningGame: null,
      killGame: vi.fn(),
      // Add other required store properties as needed
    } as any);

    render(<InGameMenuOptimized />);
    expect(screen.getByText('In-Game Menu')).toBeInTheDocument();
  });

  it('calls hideOverlay when Resume Game is clicked', async () => {
    const mockHideOverlay = vi.fn();
    const { useOverlayStore } = await import('@/application/stores/overlay-store');
    vi.mocked(useOverlayStore).mockReturnValue({
      currentOverlay: 'inGameMenu',
      hideOverlay: mockHideOverlay,
      showOverlay: vi.fn(),
    } as any);

    render(<InGameMenuOptimized />);
    const resumeButton = screen.getByText('Resume Game');
    resumeButton.click();
    expect(mockHideOverlay).toHaveBeenCalledTimes(1);
  });

  it('calls showOverlay with quickSettings when Quick Settings is clicked', async () => {
    const mockShowOverlay = vi.fn();
    const { useOverlayStore } = await import('@/application/stores/overlay-store');
    vi.mocked(useOverlayStore).mockReturnValue({
      currentOverlay: 'inGameMenu',
      hideOverlay: vi.fn(),
      showOverlay: mockShowOverlay,
    } as any);

    render(<InGameMenuOptimized />);
    const settingsButton = screen.getByText('Quick Settings');
    settingsButton.click();
    expect(mockShowOverlay).toHaveBeenCalledWith('quickSettings');
  });

  it('calls killGame when Quit Game is clicked', async () => {
    const mockKillGame = vi.fn();
    const { useGameStore } = await import('@/application/providers/StoreProvider');
    vi.mocked(useGameStore).mockReturnValue({
      activeRunningGame: {
        game: { id: '1', title: 'Test Game' },
        pid: 1234,
      },
      killGame: mockKillGame,
    } as any);

    render(<InGameMenuOptimized />);
    const quitButton = screen.getByText('Quit Game');
    quitButton.click();
    expect(mockKillGame).toHaveBeenCalledWith(1234);
  });
});
