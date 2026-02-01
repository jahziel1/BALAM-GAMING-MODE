/**
 * Integration Tests: Game Flow
 *
 * Tests the complete flow from UI action → Store → Repository → Backend simulation.
 * Uses MockGameRepository to simulate backend without Tauri runtime.
 *
 * @module tests/integration/game-flow.test
 */

/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { createGameStore } from '@application/stores/game-store';
import type { Game } from '@domain/entities/game';
import { MockGameRepository } from '@infrastructure/repositories/mock-game-repository';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Integration: Game Flow', () => {
  let repository: MockGameRepository;
  let useGameStore: ReturnType<typeof createGameStore>;

  const mockGames: Game[] = [
    {
      id: 'steam_123',
      raw_id: '123',
      title: 'Portal 2',
      path: '/games/portal2.exe',
      source: 'Steam',
      image: '/images/portal2.jpg',
      hero_image: null,
      logo: null,
      last_played: null,
    },
    {
      id: 'epic_456',
      raw_id: '456',
      title: 'Rocket League',
      path: '/games/rocketleague.exe',
      source: 'Epic',
      image: null,
      hero_image: null,
      logo: null,
      last_played: null,
    },
  ];

  beforeEach(() => {
    repository = new MockGameRepository(mockGames);
    useGameStore = createGameStore(repository);
  });

  it('should complete full game discovery flow', async () => {
    const { result } = renderHook(() => useGameStore());

    // Initial state
    expect(result.current.games).toHaveLength(0);
    expect(result.current.error).toBeNull();

    // Load games from repository
    await act(async () => {
      await result.current.loadGames();
    });

    // Verify games loaded
    expect(result.current.games).toHaveLength(2);
    expect(result.current.games[0].title).toBe('Portal 2');
    expect(result.current.games[1].title).toBe('Rocket League');
    expect(result.current.error).toBeNull();
  });

  it('should complete full game launch flow', async () => {
    const { result } = renderHook(() => useGameStore());

    // Load games first
    await act(async () => {
      await result.current.loadGames();
    });

    // Launch game
    await act(async () => {
      await result.current.launchGame('steam_123');
    });

    // Verify game is running
    expect(result.current.activeRunningGame).not.toBeNull();
    expect(result.current.activeRunningGame?.game.title).toBe('Portal 2');
    expect(result.current.activeRunningGame?.pid).toBeGreaterThan(0);
    expect(result.current.isLaunching).toBe(false);
  });

  it('should complete full game lifecycle: launch → kill', async () => {
    const { result } = renderHook(() => useGameStore());

    // Load games
    await act(async () => {
      await result.current.loadGames();
    });

    // Launch game
    await act(async () => {
      await result.current.launchGame('steam_123');
    });

    const pid = result.current.activeRunningGame?.pid || 0;
    expect(pid).toBeGreaterThan(0);

    // Kill game
    await act(async () => {
      await result.current.killGame(pid);
    });

    // Verify game is no longer running
    expect(result.current.activeRunningGame).toBeNull();
  });

  it('should complete manual game addition flow', async () => {
    const { result } = renderHook(() => useGameStore());

    // Load existing games
    await act(async () => {
      await result.current.loadGames();
    });

    expect(result.current.games).toHaveLength(2);

    // Add manual game
    await act(async () => {
      await result.current.addManualGame('Custom Game', '/custom/game.exe');
    });

    // Verify game added
    expect(result.current.games).toHaveLength(3);
    expect(result.current.games[2].title).toBe('Custom Game');
    expect(result.current.games[2].source).toBe('Manual');
  });

  it('should complete game removal flow', async () => {
    const { result } = renderHook(() => useGameStore());

    // Load games
    await act(async () => {
      await result.current.loadGames();
    });

    expect(result.current.games).toHaveLength(2);

    // Remove game
    await act(async () => {
      await result.current.removeGame('steam_123');
    });

    // Verify game removed
    expect(result.current.games).toHaveLength(1);
    expect(result.current.games[0].id).toBe('epic_456');
  });

  it('should handle error flow: launch non-existent game', async () => {
    const { result } = renderHook(() => useGameStore());

    // Attempt to launch non-existent game
    await act(async () => {
      await result.current.launchGame('invalid_id');
    });

    // Verify error handling
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toContain('Game not found');
    expect(result.current.activeRunningGame).toBeNull();
    expect(result.current.isLaunching).toBe(false);
  });

  it('should recover from error state', async () => {
    const { result } = renderHook(() => useGameStore());

    // Trigger error
    await act(async () => {
      await result.current.launchGame('invalid_id');
    });

    expect(result.current.error).not.toBeNull();

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();

    // Verify normal operations work after error
    await act(async () => {
      await result.current.loadGames();
    });

    expect(result.current.games).toHaveLength(2);
  });
});
