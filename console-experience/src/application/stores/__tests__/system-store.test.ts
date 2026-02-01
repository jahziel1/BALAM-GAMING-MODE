/**
 * Unit Tests: System Store
 *
 * Tests for system store using MockSystemRepository.
 *
 * @module application/stores/__tests__/system-store.test
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { MockSystemRepository } from '../../../infrastructure/repositories/mock-system-repository';
import { createSystemStore } from '../system-store';

describe('SystemStore', () => {
  let repository: MockSystemRepository;
  let useSystemStore: ReturnType<typeof createSystemStore>;

  beforeEach(() => {
    repository = new MockSystemRepository();
    useSystemStore = createSystemStore(repository);
  });

  describe('refreshStatus', () => {
    it('should load system status from repository', async () => {
      const { result } = renderHook(() => useSystemStore());

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.status).not.toBeNull();
      expect(result.current.status?.cpu_usage).toBe(25.5);
      expect(result.current.status?.memory_usage).toBe(45.2);
      expect(result.current.error).toBeNull();
    });

    it('should update status on refresh', async () => {
      const { result } = renderHook(() => useSystemStore());

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.status?.cpu_usage).toBe(25.5);

      // Update repository status
      repository.setStatus({ cpu_usage: 75.0 });

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.status?.cpu_usage).toBe(75.0);
    });

    it('should clear error on successful refresh', async () => {
      const { result } = renderHook(() => useSystemStore());

      // Set initial error
      act(() => {
        useSystemStore.setState({ error: 'Previous error' });
      });

      await act(async () => {
        await result.current.refreshStatus();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      const { result } = renderHook(() => useSystemStore());

      // Set error
      act(() => {
        useSystemStore.setState({ error: 'Test error' });
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
