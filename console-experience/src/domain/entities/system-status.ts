/**
 * Domain Entity: System Status
 *
 * Represents current system resource usage.
 * Pure domain entity with no framework dependencies.
 *
 * @module domain/entities/system-status
 */

/**
 * System resource usage information
 */
export interface SystemStatus {
  /** CPU usage percentage (0-100) */
  cpu_usage: number;
  /** Memory usage percentage (0-100) */
  memory_usage: number;
  /** GPU usage percentage (0-100, optional) */
  gpu_usage?: number;
  /** Current FPS if game is running (optional) */
  fps?: number;
}
