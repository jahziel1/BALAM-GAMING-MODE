import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppStore } from '@/application/stores';

import { InGameMenuOptimized } from './InGameMenuOptimized';

// ---- Mocks ----

const mockCloseLeftSidebar = vi.fn();
const mockOpenRightSidebar = vi.fn();
const mockCloseAllSidebars = vi.fn();
const mockClearActiveGame = vi.fn();
const mockKillGame = vi.fn();

const mockActiveGame = {
  game: {
    id: '1',
    raw_id: '1',
    title: 'Test Game',
    path: '/game.exe',
    source: 'Steam' as const,
    image: null,
    hero_image: null,
    logo: null,
    last_played: null,
  },
  pid: 1234,
};

function makeMockStore(overrides: Partial<AppStore> = {}): AppStore {
  return {
    overlay: {
      leftSidebarOpen: true,
      rightSidebarOpen: false,
      currentOverlay: null,
      previousOverlay: null,
    },
    game: {
      activeRunningGame: mockActiveGame,
      games: [],
      isLaunching: false,
      error: null,
    },
    settings: { animationsEnabled: true, blurEffects: true },
    performance: { fps: 0, cpuTemp: 0, gpuTemp: 0, ramUsage: 0 },
    system: { volume: 50, brightness: 50 },
    closeLeftSidebar: mockCloseLeftSidebar,
    openLeftSidebar: vi.fn(),
    openRightSidebar: mockOpenRightSidebar,
    closeRightSidebar: vi.fn(),
    closeAllSidebars: mockCloseAllSidebars,
    showOverlay: vi.fn(),
    hideOverlay: vi.fn(),
    goBack: vi.fn(),
    clearActiveGame: mockClearActiveGame,
    killGame: mockKillGame,
    loadGames: vi.fn(),
    launchGame: vi.fn(),
    setVolume: vi.fn(),
    setBrightness: vi.fn(),
    updatePerformanceMetrics: vi.fn(),
    ...overrides,
  } as AppStore;
}

vi.mock('@/application/providers/StoreProvider', () => ({
  useAppStore: vi.fn(() => makeMockStore()),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
  convertFileSrc: vi.fn((p: string) => p),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    hide: vi.fn().mockResolvedValue(undefined),
    listen: vi.fn().mockResolvedValue(vi.fn()),
    isFocused: vi.fn().mockResolvedValue(true),
    isVisible: vi.fn().mockResolvedValue(false),
  })),
}));

vi.mock('@/hooks/usePerformanceMetrics', () => ({
  usePerformanceMetrics: vi.fn(() => ({
    metrics: { fps: 0, cpuTemp: 0, gpuTemp: 0, ramUsage: 0 },
  })),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

// ---- Tests ----

describe('InGameMenuOptimized Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when overlay is open', () => {
    render(<InGameMenuOptimized />);
    expect(screen.getByText('Resume Game')).toBeInTheDocument();
    expect(screen.getByText('Quick Settings')).toBeInTheDocument();
    expect(screen.getByText('Close Game')).toBeInTheDocument();
  });

  it('displays active game title', () => {
    render(<InGameMenuOptimized />);
    expect(screen.getAllByText('Test Game').length).toBeGreaterThan(0);
  });

  it('displays fallback title when no game is running', async () => {
    const { useAppStore } = await import('@/application/providers/StoreProvider');
    vi.mocked(useAppStore).mockReturnValue(
      makeMockStore({
        game: { activeRunningGame: null, games: [], isLaunching: false, error: null },
      })
    );

    render(<InGameMenuOptimized />);
    expect(screen.getAllByText('In-Game Menu').length).toBeGreaterThan(0);
  });

  it('calls openRightSidebar when Quick Settings is clicked', () => {
    render(<InGameMenuOptimized />);
    screen.getByText('Quick Settings').click();
    expect(mockOpenRightSidebar).toHaveBeenCalled();
  });

  it('shows confirmation when Close Game is clicked', () => {
    render(<InGameMenuOptimized />);
    fireEvent.click(screen.getByText('Close Game'));
    expect(screen.getByText('Close Game?')).toBeInTheDocument();
  });

  it('calls closeLeftSidebar when Resume Game is clicked', async () => {
    render(<InGameMenuOptimized />);
    screen.getByText('Resume Game').click();
    await vi.waitFor(() => {
      expect(mockCloseLeftSidebar).toHaveBeenCalled();
    });
  });
});
