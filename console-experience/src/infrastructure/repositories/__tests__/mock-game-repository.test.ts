/**
 * Unit Tests: Mock Game Repository
 *
 * Tests for MockGameRepository to ensure test infrastructure works correctly.
 *
 * @module infrastructure/repositories/__tests__/mock-game-repository.test
 */

import { beforeEach, describe, expect, it } from 'vitest';

import type { Game } from '../../../domain/entities/game';
import { MockGameRepository } from '../mock-game-repository';

describe('MockGameRepository', () => {
  let repository: MockGameRepository;

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
  });

  describe('getAll', () => {
    it('should return all games', async () => {
      const games = await repository.getAll();
      expect(games).toHaveLength(2);
      expect(games[0].title).toBe('Test Game 1');
    });

    it('should return copy of games array', async () => {
      const games1 = await repository.getAll();
      const games2 = await repository.getAll();
      expect(games1).not.toBe(games2);
      expect(games1).toEqual(games2);
    });

    it('should return empty array when initialized empty', async () => {
      const emptyRepo = new MockGameRepository();
      const games = await emptyRepo.getAll();
      expect(games).toHaveLength(0);
    });
  });

  describe('launch', () => {
    it('should launch game and return ActiveGame', async () => {
      const activeGame = await repository.launch('steam_1');
      expect(activeGame.game.id).toBe('steam_1');
      expect(activeGame.pid).toBeGreaterThan(0);
    });

    it('should throw error for non-existent game', async () => {
      await expect(repository.launch('invalid_id')).rejects.toThrow('Game not found: invalid_id');
    });

    it('should increment PID for each launch', async () => {
      const active1 = await repository.launch('steam_1');
      await repository.kill(active1.pid);
      const active2 = await repository.launch('steam_1');
      expect(active2.pid).toBeGreaterThan(active1.pid);
    });

    it('should track active game', async () => {
      await repository.launch('steam_1');
      const activeGame = repository.getActiveGame();
      expect(activeGame).not.toBeNull();
      expect(activeGame?.game.id).toBe('steam_1');
    });
  });

  describe('kill', () => {
    it('should kill active game by PID', async () => {
      const activeGame = await repository.launch('steam_1');
      await repository.kill(activeGame.pid);
      expect(repository.getActiveGame()).toBeNull();
    });

    it('should do nothing when killing non-active PID', async () => {
      await repository.launch('steam_1');
      await repository.kill(9999);
      expect(repository.getActiveGame()).not.toBeNull();
    });
  });

  describe('addManual', () => {
    it('should add manual game', async () => {
      const newGame = await repository.addManual('New Game', '/path/to/game.exe');
      expect(newGame.title).toBe('New Game');
      expect(newGame.path).toBe('/path/to/game.exe');
      expect(newGame.source).toBe('Manual');
    });

    it('should generate unique ID', async () => {
      const game1 = await repository.addManual('Game 1', '/path1.exe');
      const game2 = await repository.addManual('Game 2', '/path2.exe');
      expect(game1.id).not.toBe(game2.id);
    });

    it('should add to games list', async () => {
      await repository.addManual('New Game', '/path/to/game.exe');
      const games = await repository.getAll();
      expect(games).toHaveLength(3);
      expect(games[2].title).toBe('New Game');
    });
  });

  describe('remove', () => {
    it('should remove game by ID', async () => {
      await repository.remove('steam_1');
      const games = await repository.getAll();
      expect(games).toHaveLength(1);
      expect(games[0].id).toBe('epic_2');
    });

    it('should do nothing when removing non-existent game', async () => {
      await repository.remove('invalid_id');
      const games = await repository.getAll();
      expect(games).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('should reset games list', async () => {
      repository.reset([]);
      const games = await repository.getAll();
      expect(games).toHaveLength(0);
    });

    it('should clear active game', async () => {
      await repository.launch('steam_1');
      repository.reset();
      expect(repository.getActiveGame()).toBeNull();
    });

    it('should reset PID counter', async () => {
      const active1 = await repository.launch('steam_1');
      const firstPid = active1.pid;
      repository.reset(mockGames);
      const active2 = await repository.launch('steam_1');
      expect(active2.pid).toBe(firstPid);
    });
  });
});
