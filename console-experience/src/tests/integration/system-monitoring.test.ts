/**
 * Integration Tests: System Monitoring
 *
 * Tests system status monitoring flows.
 *
 * @module tests/integration/system-monitoring.test
 */

import { createSystemStore } from '@application/stores/system-store';
import { MockSystemRepository } from '@infrastructure/repositories/mock-system-repository';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Integration: System Monitoring', () => {
  let repository: MockSystemRepository;
  let useSystemStore: ReturnType<typeof createSystemStore>;

  beforeEach(() => {
    repository = new MockSystemRepository();
    useSystemStore = createSystemStore(repository);
  });

  it('should complete status refresh flow', async () => {
    const { result } = renderHook(() => useSystemStore());

    // Initial state
    expect(result.current.status).toBeNull();

    // Refresh status
    await act(async () => {
      await result.current.refreshStatus();
    });

    // Verify status loaded
    expect(result.current.status).not.toBeNull();
    expect(result.current.status?.cpu_usage).toBe(25.5);
    expect(result.current.status?.memory_usage).toBe(45.2);
    expect(result.current.error).toBeNull();
  });

  it('should complete monitoring flow: multiple refreshes', async () => {
    const { result } = renderHook(() => useSystemStore());

    // First refresh
    await act(async () => {
      await result.current.refreshStatus();
    });

    expect(result.current.status?.cpu_usage).toBe(25.5);

    // Simulate system load increase
    repository.setStatus({ cpu_usage: 85.0, memory_usage: 75.0 });

    // Second refresh
    await act(async () => {
      await result.current.refreshStatus();
    });

    expect(result.current.status?.cpu_usage).toBe(85.0);
    expect(result.current.status?.memory_usage).toBe(75.0);
  });

  it('should handle error recovery flow', async () => {
    const { result } = renderHook(() => useSystemStore());

    // Set error
    act(() => {
      useSystemStore.setState({ error: 'Connection failed' });
    });

    expect(result.current.error).toBe('Connection failed');

    // Clear error and refresh
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.refreshStatus();
    });

    expect(result.current.status).not.toBeNull();
  });
});
