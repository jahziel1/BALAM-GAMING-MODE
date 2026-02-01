/**
 * Unit Tests: Mock System Repository
 *
 * Tests for MockSystemRepository to ensure test infrastructure works correctly.
 *
 * @module infrastructure/repositories/__tests__/mock-system-repository.test
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { MockSystemRepository } from '../mock-system-repository';

describe('MockSystemRepository', () => {
  let repository: MockSystemRepository;

  beforeEach(() => {
    repository = new MockSystemRepository();
  });

  describe('getStatus', () => {
    it('should return default system status', async () => {
      const status = await repository.getStatus();
      expect(status.cpu_usage).toBe(25.5);
      expect(status.memory_usage).toBe(45.2);
      expect(status.gpu_usage).toBe(30.1);
      expect(status.fps).toBe(60);
    });

    it('should return copy of status object', async () => {
      const status1 = await repository.getStatus();
      const status2 = await repository.getStatus();
      expect(status1).not.toBe(status2);
      expect(status1).toEqual(status2);
    });
  });

  describe('setStatus', () => {
    it('should update CPU usage', async () => {
      repository.setStatus({ cpu_usage: 75.5 });
      const status = await repository.getStatus();
      expect(status.cpu_usage).toBe(75.5);
      expect(status.memory_usage).toBe(45.2); // Other values unchanged
    });

    it('should update multiple values', async () => {
      repository.setStatus({ cpu_usage: 80, memory_usage: 90, fps: 120 });
      const status = await repository.getStatus();
      expect(status.cpu_usage).toBe(80);
      expect(status.memory_usage).toBe(90);
      expect(status.fps).toBe(120);
    });

    it('should handle partial updates', async () => {
      repository.setStatus({ gpu_usage: 50 });
      const status = await repository.getStatus();
      expect(status.gpu_usage).toBe(50);
      expect(status.cpu_usage).toBe(25.5);
    });
  });

  describe('reset', () => {
    it('should reset to default values', async () => {
      repository.setStatus({ cpu_usage: 100, memory_usage: 100 });
      repository.reset();
      const status = await repository.getStatus();
      expect(status.cpu_usage).toBe(25.5);
      expect(status.memory_usage).toBe(45.2);
    });
  });
});
