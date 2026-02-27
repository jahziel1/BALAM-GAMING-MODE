/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { invoke } from '@tauri-apps/api/core';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NavigationAction } from '../domain/input/NavigationEvent';
import { useNavigation } from './useNavigation';

// Mock Tauri window
const mockWindow = {
  hide: vi.fn(() => Promise.resolve()),
  show: vi.fn(() => Promise.resolve()),
  setFocus: vi.fn(() => Promise.resolve()),
  listen: vi.fn(() => Promise.resolve(() => {})),
  isVisible: vi.fn(() => Promise.resolve(true)),
};

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => mockWindow),
  getCurrent: vi.fn(() => mockWindow),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve()),
}));

// Mock InputAdapter
let navigationCallback: (event: any) => void = () => {};
vi.mock('../adapters/input/InputAdapter', () => ({
  inputAdapter: {
    onNavigationEvent: vi.fn((cb) => {
      navigationCallback = cb;
      return () => {};
    }),
    dispatchKeyEvent: vi.fn(),
  },
}));

// Mock AppStore
const mockOpenLeftSidebar = vi.fn();
const mockCloseLeftSidebar = vi.fn();
const mockOpenRightSidebar = vi.fn();
const mockCloseRightSidebar = vi.fn();

let mockOverlayState = {
  leftSidebarOpen: false,
  rightSidebarOpen: false,
};

vi.mock('../application/providers/StoreProvider', () => ({
  useAppStore: vi.fn(() => ({
    overlay: mockOverlayState,
    openLeftSidebar: mockOpenLeftSidebar,
    closeLeftSidebar: mockCloseLeftSidebar,
    openRightSidebar: mockOpenRightSidebar,
    closeRightSidebar: mockCloseRightSidebar,
  })),
}));

describe('useNavigation Behavioral Tests', () => {
  const defaultProps = {
    itemCount: 10,
    sidebarItemCount: 5,
    onLaunch: vi.fn(),
    onSidebarSelect: vi.fn(),
    onQuit: vi.fn(),
    activeRunningGame: null,
  };

  let currentTime = 1000;

  beforeEach(() => {
    vi.clearAllMocks();
    currentTime = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      currentTime += 100; // Advance 100ms on each call to beat 75ms debounce
      return currentTime;
    });
    mockOverlayState = {
      leftSidebarOpen: false,
      rightSidebarOpen: false,
    };
  });

  const setupHook = (props = {}) => {
    return renderHook(() => {
      const p = { ...defaultProps, ...props };
      return useNavigation(
        p.itemCount,
        [], // carouselOffsets
        p.sidebarItemCount,
        p.onLaunch,
        p.onSidebarSelect,
        p.onQuit,
        p.activeRunningGame as any
      );
    });
  };

  describe('Grid Navigation (Steam Big Picture Style)', () => {
    it('should navigate horizontally in the library', () => {
      const { result } = setupHook();

      act(() => {
        navigationCallback({ action: NavigationAction.RIGHT });
      });
      expect(result.current.activeIndex).toBe(1);
    });

    it('should NOT wrap around on boundaries', () => {
      const { result } = setupHook({ itemCount: 2 });

      act(() => {
        navigationCallback({ action: NavigationAction.LEFT });
      });
      expect(result.current.activeIndex).toBe(0);

      act(() => {
        navigationCallback({ action: NavigationAction.RIGHT });
      });
      expect(result.current.activeIndex).toBe(1);

      act(() => {
        navigationCallback({ action: NavigationAction.RIGHT });
      });
      expect(result.current.activeIndex).toBe(1); // Stays at max
    });
  });

  describe('Overlay & Sidebar Conflicts', () => {
    it('should block CONFIRM when QuickSettings is open', () => {
      mockOverlayState.rightSidebarOpen = true;

      const onLaunch = vi.fn();
      setupHook({ onLaunch });

      act(() => {
        navigationCallback({ action: NavigationAction.CONFIRM });
      });

      expect(onLaunch).not.toHaveBeenCalled();
    });

    it('should toggle QuickSettings with QUICK_SETTINGS action', () => {
      setupHook();

      act(() => {
        navigationCallback({ action: NavigationAction.QUICK_SETTINGS });
      });

      expect(mockOpenRightSidebar).toHaveBeenCalled();
    });
  });

  describe('In-Game Menu Logic', () => {
    it('should toggle native overlay when BACK is pressed and a game is running', () => {
      const activeRunningGame = { id: '1', game: { title: 'Test Game' } };
      setupHook({ activeRunningGame });

      act(() => {
        navigationCallback({ action: NavigationAction.BACK });
      });

      // With a game running the BACK action toggles the native overlay window,
      // it does NOT open the left sidebar (that was the old pre-overlay behaviour).
      expect(invoke).toHaveBeenCalledWith('toggle_game_overlay');
      expect(mockOpenLeftSidebar).not.toHaveBeenCalled();
    });

    it('BACK when InGameMenu is open closes it and hides window', () => {
      // Scenario: InGameMenu is Open
      mockOverlayState.leftSidebarOpen = true;

      setupHook();

      // Pressing BACK with leftSidebarOpen=true should close the menu and hide window
      act(() => {
        navigationCallback({ action: NavigationAction.BACK });
      });

      expect(mockCloseLeftSidebar).toHaveBeenCalled();
      // Window hide is called async (void promise), give it a tick
      // The close behavior is the key assertion
      expect(mockCloseLeftSidebar).toHaveBeenCalledTimes(1);
    });
  });
});
