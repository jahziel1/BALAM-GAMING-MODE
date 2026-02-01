/**
 * Port: System Repository
 *
 * Interface for system resource monitoring operations.
 *
 * @module domain/repositories/system-repository
 */

import type { SystemStatus } from '../entities/system-status';

/**
 * Repository interface for system operations
 */
export interface SystemRepository {
  /**
   * Get current system resource usage
   * @returns Promise resolving to system status
   */
  getStatus(): Promise<SystemStatus>;
}
