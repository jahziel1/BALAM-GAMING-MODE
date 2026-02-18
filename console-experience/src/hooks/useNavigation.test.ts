/* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/unbound-method */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useNavigation } from './useNavigation';

// Mock dependencies
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    hide: vi.fn(() => Promise.resolve()),
    show: vi.fn(() => Promise.resolve()),
    setFocus: vi.fn(() => Promise.resolve()),
    listen: vi.fn(() => Promise.resolve(() => {})),
    isVisible: vi.fn(() => Promise.resolve(true)),
  })),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve()),
}));

vi.mock('../adapters/input/InputAdapter', () => ({
  inputAdapter: {
    onNavigationEvent: vi.fn(() => () => {}),
    dispatchKeyEvent: vi.fn(),
  },
}));

vi.mock('../application/providers/StoreProvider', () => ({
  useAppStore: vi.fn(() => ({
    overlay: { leftSidebarOpen: false, rightSidebarOpen: false },
    openLeftSidebar: vi.fn(),
    closeLeftSidebar: vi.fn(),
    openRightSidebar: vi.fn(),
    closeRightSidebar: vi.fn(),
  })),
}));

describe('useNavigation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() =>
      useNavigation(
        10, // itemCount
        [], // carouselOffsets
        5, // sidebarItemCount
        () => {}, // onLaunch
        () => {}, // onSidebarSelect
        () => {}, // onQuit
        null // activeRunningGame
      )
    );

    expect(result.current.focusArea).toBe('LIBRARY');
    expect(result.current.isSidebarOpen).toBe(false);
    expect(result.current.isInGameMenuOpen).toBe(false);
    expect(result.current.isQuickSettingsOpen).toBe(false);
    expect(result.current.activeIndex).toBe(0);
    expect(result.current.sidebarIndex).toBe(0);
  });

  it('provides navigation control functions', () => {
    const { result } = renderHook(() =>
      useNavigation(
        10, // itemCount
        [], // carouselOffsets
        5, // sidebarItemCount
        () => {}, // onLaunch
        () => {}, // onSidebarSelect
        () => {}, // onQuit
        null // activeRunningGame
      )
    );

    expect(typeof result.current.setFocusArea).toBe('function');
    expect(typeof result.current.setSidebarOpen).toBe('function');
    expect(typeof result.current.setActiveIndex).toBe('function');
    expect(typeof result.current.setSidebarIndex).toBe('function');
    expect(typeof result.current.setInGameMenuOpen).toBe('function');
    expect(typeof result.current.setQuickSettingsOpen).toBe('function');
  });

  it('subscribes to navigation events', async () => {
    const { inputAdapter } = await import('../adapters/input/InputAdapter');
    renderHook(() =>
      useNavigation(
        10, // itemCount
        [], // carouselOffsets
        5, // sidebarItemCount
        () => {}, // onLaunch
        () => {}, // onSidebarSelect
        () => {}, // onQuit
        null // activeRunningGame
      )
    );
    expect(inputAdapter.onNavigationEvent).toHaveBeenCalled();
  });
});
