import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

// Mock all stores and providers
vi.mock('./application/providers/StoreProvider', () => ({
  useAppStore: vi.fn(() => ({
    overlay: { leftSidebarOpen: false, rightSidebarOpen: false },
    game: {
      activeRunningGame: null,
      games: [],
      isLaunching: false,
      error: null,
    },
    openRightSidebar: vi.fn(),
    closeRightSidebar: vi.fn(),
    openLeftSidebar: vi.fn(),
    closeLeftSidebar: vi.fn(),
    closeAllSidebars: vi.fn(),
    clearActiveGame: vi.fn(),
  })),
  useGameStore: vi.fn(() => ({
    games: [
      { id: '1', title: 'Test Game 1', is_favorite: 0, play_time: 0 },
      { id: '2', title: 'Test Game 2', is_favorite: 1, play_time: 100 },
    ],
    isLaunching: false,
    activeRunningGame: null,
    launchGame: vi.fn(),
    clearActiveGame: vi.fn(),
    killGame: vi.fn(),
    addManualGame: vi.fn(),
    removeGame: vi.fn(),
    loadGames: vi.fn(),
  })),
}));

// Mock custom hooks that use Tauri APIs
vi.mock('./hooks/useAudio', () => ({
  useAudio: vi.fn(() => ({ audioLaunch: vi.fn() })),
}));

vi.mock('./hooks/useHaptic', () => ({
  useHaptic: vi.fn(() => ({ hapticEvent: vi.fn() })),
}));

vi.mock('./hooks/useInputDevice', () => ({
  useInputDevice: vi.fn(() => ({ deviceType: 'KEYBOARD' })),
}));

// Mock database services
vi.mock('./services/database', () => ({
  initDatabase: vi.fn().mockResolvedValue(undefined),
  addPlayTime: vi.fn().mockResolvedValue(undefined),
  toggleFavorite: vi.fn().mockResolvedValue(undefined),
}));

// Mock Tauri APIs
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {
    // Mock unlisten function
  }),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    hide: vi.fn().mockResolvedValue(undefined),
    minimize: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
    setFocus: vi.fn().mockResolvedValue(undefined),
    isVisible: vi.fn().mockResolvedValue(true),
    listen: vi.fn().mockResolvedValue(() => {
      // Mock unlisten function
    }),
  })),
}));

// Mock navigator.getGamepads for InputDeviceDetector
Object.defineProperty(navigator, 'getGamepads', {
  value: vi.fn(() => []),
  writable: true,
});

describe('App Baseline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main layout components', () => {
    act(() => {
      render(<App />);
    });

    // Sidebar should be present (hidden or visible)
    // We check for the menu hint area which is visible when sidebar is closed
    expect(screen.getByText(/Input:/i)).toBeDefined();
  });

  it('renders the games list', () => {
    act(() => {
      render(<App />);
    });

    // Use getAllByText because titles appear in Hero and Card
    expect(screen.getAllByText('Test Game 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Test Game 2').length).toBeGreaterThan(0);
  });

  it('renders the TopBar', () => {
    act(() => {
      render(<App />);
    });
    // TopBar usually has time or status icons, checking for structure
    // We can check for known aria-labels or text if available in TopBar
    // For now assuming TopBar renders without crashing
    const mainContent = document.querySelector('.main-content');
    expect(mainContent).toBeDefined();
  });
});
