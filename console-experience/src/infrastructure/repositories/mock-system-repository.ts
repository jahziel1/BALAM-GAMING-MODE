/**
 * Infrastructure: Mock System Repository
 *
 * Mock implementation for testing system status without Tauri runtime.
 *
 * @module infrastructure/repositories/mock-system-repository
 */

import type { SystemStatus } from '../../domain/entities/system-status';
import type { SystemRepository } from '../../domain/repositories/system-repository';

/**
 * Mock implementation of SystemRepository for testing
 */
export class MockSystemRepository implements SystemRepository {
  private status: SystemStatus = {
    cpu_usage: 25.5,
    memory_usage: 45.2,
    gpu_usage: 30.1,
    fps: 60,
  };

  async getStatus(): Promise<SystemStatus> {
    return Promise.resolve({ ...this.status });
  }

  /**
   * Test helper: Set mock system status
   */
  setStatus(status: Partial<SystemStatus>): void {
    this.status = { ...this.status, ...status };
  }

  /**
   * Test helper: Reset to default values
   */
  reset(): void {
    this.status = {
      cpu_usage: 25.5,
      memory_usage: 45.2,
      gpu_usage: 30.1,
      fps: 60,
    };
  }
}
