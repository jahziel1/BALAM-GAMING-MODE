/**
 * Unit tests for useNavigation hook.
 * Tests reducer state transitions and key callbacks.
 * useAppStore is mocked to isolate from Tauri/provider setup.
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNavigation } from '../useNavigation';

// Mock useAppStore — provides overlay state + sidebar action stubs
const mockOpenLeftSidebar = vi.fn();
const mockCloseLeftSidebar = vi.fn();
const mockOpenRightSidebar = vi.fn();
const mockCloseRightSidebar = vi.fn();

const createMockOverlay = (leftSidebarOpen = false, rightSidebarOpen = false) => ({
  currentOverlay: null as null | string,
  previousOverlay: null as null | string,
  leftSidebarOpen,
  rightSidebarOpen,
});

vi.mock('../../application/providers/StoreProvider', () => ({
  useAppStore: () => ({
    overlay: createMockOverlay(),
    openLeftSidebar: mockOpenLeftSidebar,
    closeLeftSidebar: mockCloseLeftSidebar,
    openRightSidebar: mockOpenRightSidebar,
    closeRightSidebar: mockCloseRightSidebar,
  }),
}));

// Mock inputAdapter to prevent real listener registration
vi.mock('../../adapters/input/InputAdapter', () => ({
  inputAdapter: {
    onNavigationEvent: vi.fn(() => vi.fn()),
    dispatchKeyEvent: vi.fn(),
  },
}));

// Mock Tauri listen to prevent errors in jsdom
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(vi.fn())),
  emit: vi.fn(),
}));

// Mock Tauri window to prevent errors in jsdom
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    isFocused: vi.fn(() => Promise.resolve(true)),
    isVisible: vi.fn(() => Promise.resolve(false)),
    listen: vi.fn(() => Promise.resolve(vi.fn())),
  })),
}));

const defaultHookArgs = {
  itemCount: 5,
  carouselOffsets: [0] as number[],
  sidebarItemCount: 7,
  onLaunch: vi.fn(),
  onSidebarSelect: vi.fn(),
  onQuit: vi.fn(),
  activeRunningGame: null,
  isDisabled: false,
} as const;

function renderNav(overrides = {}) {
  const args = { ...defaultHookArgs, ...overrides };
  return renderHook(() =>
    useNavigation(
      args.itemCount,
      args.carouselOffsets,
      args.sidebarItemCount,
      args.onLaunch,
      args.onSidebarSelect,
      args.onQuit,
      args.activeRunningGame,
      args.isDisabled
    )
  );
}

describe('useNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Initial state ----

  it('starts with focusArea = LIBRARY', () => {
    const { result } = renderNav();
    expect(result.current.focusArea).toBe('LIBRARY');
  });

  it('starts with isSidebarOpen = false', () => {
    const { result } = renderNav();
    expect(result.current.isSidebarOpen).toBe(false);
  });

  it('starts with activeIndex = 0', () => {
    const { result } = renderNav();
    expect(result.current.activeIndex).toBe(0);
  });

  it('starts with sidebarIndex = 0', () => {
    const { result } = renderNav();
    expect(result.current.sidebarIndex).toBe(0);
  });

  // ---- setFocusArea ----

  it('setFocusArea(HERO) changes focusArea to HERO', () => {
    const { result } = renderNav();
    act(() => {
      result.current.setFocusArea('HERO');
    });
    expect(result.current.focusArea).toBe('HERO');
  });

  it('setFocusArea(SEARCH) changes focusArea to SEARCH', () => {
    const { result } = renderNav();
    act(() => {
      result.current.setFocusArea('SEARCH');
    });
    expect(result.current.focusArea).toBe('SEARCH');
  });

  // ---- setSidebarOpen ----

  it('setSidebarOpen(true) sets isSidebarOpen to true', () => {
    const { result } = renderNav();
    act(() => {
      result.current.setSidebarOpen(true);
    });
    expect(result.current.isSidebarOpen).toBe(true);
  });

  it('setSidebarOpen(false) sets isSidebarOpen to false', () => {
    const { result } = renderNav();
    act(() => {
      result.current.setSidebarOpen(true);
    });
    act(() => {
      result.current.setSidebarOpen(false);
    });
    expect(result.current.isSidebarOpen).toBe(false);
  });

  // ---- setActiveIndex ----

  it('setActiveIndex(3) sets activeIndex to 3', () => {
    const { result } = renderNav();
    act(() => {
      result.current.setActiveIndex(3);
    });
    expect(result.current.activeIndex).toBe(3);
  });

  // ---- setInGameMenuOpen ----

  it('setInGameMenuOpen(true) calls openLeftSidebar', () => {
    const { result } = renderNav();
    act(() => {
      result.current.setInGameMenuOpen(true);
    });
    expect(mockOpenLeftSidebar).toHaveBeenCalled();
  });

  it('setInGameMenuOpen(false) calls closeLeftSidebar', () => {
    const { result } = renderNav();
    act(() => {
      result.current.setInGameMenuOpen(false);
    });
    expect(mockCloseLeftSidebar).toHaveBeenCalled();
  });

  // ---- setQuickSettingsOpen ----

  it('setQuickSettingsOpen(true) calls openRightSidebar', () => {
    const { result } = renderNav();
    act(() => {
      result.current.setQuickSettingsOpen(true);
    });
    expect(mockOpenRightSidebar).toHaveBeenCalled();
  });

  it('setQuickSettingsOpen(false) calls closeRightSidebar', () => {
    const { result } = renderNav();
    act(() => {
      result.current.setQuickSettingsOpen(false);
    });
    expect(mockCloseRightSidebar).toHaveBeenCalled();
  });
});
