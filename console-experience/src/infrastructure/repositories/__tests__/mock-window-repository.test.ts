/**
 * Unit Tests: Mock Window Repository
 *
 * Tests for MockWindowRepository to ensure test infrastructure works correctly.
 *
 * @module infrastructure/repositories/__tests__/mock-window-repository.test
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { MockWindowRepository } from '../mock-window-repository';

describe('MockWindowRepository', () => {
  let repository: MockWindowRepository;

  beforeEach(() => {
    repository = new MockWindowRepository();
  });

  describe('minimize', () => {
    it('should set window to minimized', async () => {
      await repository.minimize();
      const state = repository.getState();
      expect(state.isMinimized).toBe(true);
    });
  });

  describe('close', () => {
    it('should set window to closed', async () => {
      await repository.close();
      const state = repository.getState();
      expect(state.isClosed).toBe(true);
    });
  });

  describe('toggleFullscreen', () => {
    it('should toggle fullscreen from false to true', async () => {
      await repository.toggleFullscreen();
      const state = repository.getState();
      expect(state.isFullscreen).toBe(true);
    });

    it('should toggle fullscreen from true to false', async () => {
      await repository.toggleFullscreen(); // true
      await repository.toggleFullscreen(); // false
      const state = repository.getState();
      expect(state.isFullscreen).toBe(false);
    });

    it('should toggle multiple times correctly', async () => {
      await repository.toggleFullscreen(); // true
      await repository.toggleFullscreen(); // false
      await repository.toggleFullscreen(); // true
      const state = repository.getState();
      expect(state.isFullscreen).toBe(true);
    });
  });

  describe('getState', () => {
    it('should return initial state', () => {
      const state = repository.getState();
      expect(state.isMinimized).toBe(false);
      expect(state.isClosed).toBe(false);
      expect(state.isFullscreen).toBe(false);
    });

    it('should return current state after operations', async () => {
      await repository.minimize();
      await repository.toggleFullscreen();
      const state = repository.getState();
      expect(state.isMinimized).toBe(true);
      expect(state.isClosed).toBe(false);
      expect(state.isFullscreen).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', async () => {
      await repository.minimize();
      await repository.toggleFullscreen();
      repository.reset();
      const state = repository.getState();
      expect(state.isMinimized).toBe(false);
      expect(state.isClosed).toBe(false);
      expect(state.isFullscreen).toBe(false);
    });
  });
});
