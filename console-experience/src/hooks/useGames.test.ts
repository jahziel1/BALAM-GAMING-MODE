import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Game } from '../types/game';
import { useGames } from './useGames';

const mockGame: Game = {
  id: '1',
  raw_id: 'steam_1',
  title: 'Test Game',
  source: 'Steam',
  path: '/path/to/game/game.exe',
  image: null,
  hero_image: null,
  logo: null,
  last_played: null,
};

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === 'get_games') return Promise.resolve([mockGame]);
    if (cmd === 'scan_games') return Promise.resolve([mockGame]);
    if (cmd === 'add_game_manually') return Promise.resolve(mockGame);
    if (cmd === 'remove_game') return Promise.resolve(null);
    return Promise.resolve(null);
  }),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    hide: vi.fn(() => Promise.resolve()),
    show: vi.fn(() => Promise.resolve()),
    setFocus: vi.fn(() => Promise.resolve()),
  })),
}));

describe('useGames Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty games array', () => {
    const { result } = renderHook(() => useGames());
    expect(result.current.games).toEqual([]);
    expect(result.current.isLaunching).toBe(false);
    expect(result.current.activeRunningGame).toBeNull();
  });

  it('provides game management functions', () => {
    const { result } = renderHook(() => useGames());
    expect(typeof result.current.launchGame).toBe('function');
    expect(typeof result.current.killGame).toBe('function');
    expect(typeof result.current.addManualGame).toBe('function');
    expect(typeof result.current.removeGame).toBe('function');
    expect(typeof result.current.refreshGames).toBe('function');
  });

  it('loads games on mount', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    renderHook(() => useGames());
    // Wait for useEffect to trigger
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(invoke).toHaveBeenCalledWith('get_games');
  });
});
