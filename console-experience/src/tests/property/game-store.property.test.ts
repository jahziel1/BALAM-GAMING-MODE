/**
 * Property Tests: Game Store
 *
 * Property-based tests for game store using fast-check.
 * Tests invariants and properties that should hold for all inputs.
 *
 * @module tests/property/game-store.property.test
 */

import { createGameStore } from '@application/stores/game-store';
import type { Game } from '@domain/entities/game';
import { MockGameRepository } from '@infrastructure/repositories/mock-game-repository';
import { act, renderHook } from '@testing-library/react';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

describe('Property: Game Store', () => {
  /**
   * Arbitrary for generating valid games
   */
  const gameArbitrary = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    raw_id: fc.string({ minLength: 1, maxLength: 20 }),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    path: fc.string({ minLength: 5, maxLength: 200 }),
    source: fc.constantFrom('Steam' as const, 'Epic' as const, 'Xbox' as const, 'Manual' as const),
    image: fc.constantFrom(null, '/image.jpg'),
    hero_image: fc.constantFrom(null, '/hero.jpg'),
    logo: fc.constantFrom(null, '/logo.png'),
    last_played: fc.constantFrom(null, Date.now()),
  });

  it('should never increase game count when removing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(gameArbitrary, { minLength: 1, maxLength: 20 }),
        async (games: Game[]) => {
          const repository = new MockGameRepository(games);
          const useGameStore = createGameStore(repository);
          const { result } = renderHook(() => useGameStore());

          await act(async () => {
            await result.current.loadGames();
          });

          const initialCount = result.current.games.length;

          if (initialCount > 0) {
            const gameToRemove = result.current.games[0];

            await act(async () => {
              await result.current.removeGame(gameToRemove.id);
            });

            expect(result.current.games.length).toBeLessThanOrEqual(initialCount);
          }
        }
      )
    );
  });

  it('should always increase game count when adding manual game', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(gameArbitrary, { maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 100 }),
        async (games: Game[], title: string, exePath: string) => {
          const repository = new MockGameRepository(games);
          const useGameStore = createGameStore(repository);
          const { result } = renderHook(() => useGameStore());

          await act(async () => {
            await result.current.loadGames();
          });

          const initialCount = result.current.games.length;

          await act(async () => {
            await result.current.addManualGame(title, exePath);
          });

          expect(result.current.games.length).toBe(initialCount + 1);
        }
      )
    );
  });

  it('should maintain game count after kill operation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(gameArbitrary, { minLength: 1, maxLength: 10 }),
        async (games: Game[]) => {
          const repository = new MockGameRepository(games);
          const useGameStore = createGameStore(repository);
          const { result } = renderHook(() => useGameStore());

          await act(async () => {
            await result.current.loadGames();
          });

          const initialCount = result.current.games.length;

          // Launch and kill game
          const firstGame = result.current.games[0];
          await act(async () => {
            await result.current.launchGame(firstGame.id);
          });

          const pid = result.current.activeRunningGame?.pid;
          if (pid) {
            await act(async () => {
              await result.current.killGame(pid);
            });
          }

          // Game count should remain the same
          expect(result.current.games.length).toBe(initialCount);
        }
      )
    );
  });

  it('should always have null activeGame after kill', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(gameArbitrary, { minLength: 1, maxLength: 10 }),
        async (games: Game[]) => {
          const repository = new MockGameRepository(games);
          const useGameStore = createGameStore(repository);
          const { result } = renderHook(() => useGameStore());

          await act(async () => {
            await result.current.loadGames();
          });

          const firstGame = result.current.games[0];
          await act(async () => {
            await result.current.launchGame(firstGame.id);
          });

          const pid = result.current.activeRunningGame?.pid;
          if (pid) {
            await act(async () => {
              await result.current.killGame(pid);
            });

            expect(result.current.activeRunningGame).toBeNull();
          }
        }
      )
    );
  });

  it('should never have duplicate game IDs', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(gameArbitrary, { maxLength: 20 }), async (games: Game[]) => {
        const repository = new MockGameRepository(games);
        const useGameStore = createGameStore(repository);
        const { result } = renderHook(() => useGameStore());

        await act(async () => {
          await result.current.loadGames();
        });

        const ids = result.current.games.map((g) => g.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(ids.length);
      })
    );
  });
});
