/**
 * Unit Tests: Game Store
 *
 * Tests for game store using MockGameRepository.
 *
 * @module application/stores/__tests__/game-store.test
 */

/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { Game } from '../../../domain/entities/game';
import { MockGameRepository } from '../../../infrastructure/repositories/mock-game-repository';
import { createGameStore } from '../game-store';

describe('GameStore', () => {
  let repository: MockGameRepository;
  let useGameStore: ReturnType<typeof createGameStore>;

  const mockGames: Game[] = [
    {
      id: 'steam_1',
      raw_id: '1',
      title: 'Test Game 1',
      path: '/games/test1.exe',
      source: 'Steam',
      image: null,
      hero_image: null,
      logo: null,
      last_played: null,
    },
    {
      id: 'epic_2',
      raw_id: '2',
      title: 'Test Game 2',
      path: '/games/test2.exe',
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

  describe('loadGames', () => {
    it('should load games from repository', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        await result.current.loadGames();
      });

      expect(result.current.games).toHaveLength(2);
      expect(result.current.games[0].title).toBe('Test Game 1');
      expect(result.current.error).toBeNull();
    });

    it('should clear error on successful load', async () => {
      const { result } = renderHook(() => useGameStore());

      // Set initial error
      act(() => {
        useGameStore.setState({ error: 'Previous error' });
      });

      await act(async () => {
        await result.current.loadGames();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('launchGame', () => {
    it('should launch game and set active game', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        await result.current.launchGame('steam_1');
      });

      expect(result.current.activeRunningGame).not.toBeNull();
      expect(result.current.activeRunningGame?.game.id).toBe('steam_1');
      expect(result.current.activeRunningGame?.pid).toBeGreaterThan(0);
      expect(result.current.isLaunching).toBe(false);
    });

    it('should handle launch error', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        await result.current.launchGame('invalid_id');
      });

      expect(result.current.error).toContain('Game not found');
      expect(result.current.activeRunningGame).toBeNull();
      expect(result.current.isLaunching).toBe(false);
    });
  });

  describe('killGame', () => {
    it('should kill game and clear active game', async () => {
      const { result } = renderHook(() => useGameStore());

      // Launch game first
      await act(async () => {
        await result.current.launchGame('steam_1');
      });

      const pid = result.current.activeRunningGame?.pid || 0;

      // Kill game
      await act(async () => {
        await result.current.killGame(pid);
      });

      expect(result.current.activeRunningGame).toBeNull();
    });
  });

  describe('addManualGame', () => {
    it('should add manual game to games list', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        await result.current.loadGames();
      });

      expect(result.current.games).toHaveLength(2);

      await act(async () => {
        await result.current.addManualGame('New Game', '/path/to/game.exe');
      });

      expect(result.current.games).toHaveLength(3);
      expect(result.current.games[2].title).toBe('New Game');
      expect(result.current.games[2].source).toBe('Manual');
    });
  });

  describe('removeGame', () => {
    it('should remove game from games list', async () => {
      const { result } = renderHook(() => useGameStore());

      await act(async () => {
        await result.current.loadGames();
      });

      expect(result.current.games).toHaveLength(2);

      await act(async () => {
        await result.current.removeGame('steam_1');
      });

      expect(result.current.games).toHaveLength(1);
      expect(result.current.games[0].id).toBe('epic_2');
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      const { result } = renderHook(() => useGameStore());

      // Set error
      act(() => {
        useGameStore.setState({ error: 'Test error' });
      });

      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
