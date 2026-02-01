/**
 * Port: Window Repository
 *
 * Interface for window management operations.
 *
 * @module domain/repositories/window-repository
 */

/**
 * Repository interface for window operations
 */
export interface WindowRepository {
  /**
   * Minimize the application window
   * @returns Promise resolving when window is minimized
   */
  minimize(): Promise<void>;

  /**
   * Close the application window
   * @returns Promise resolving when window is closed
   */
  close(): Promise<void>;

  /**
   * Toggle fullscreen mode
   * @returns Promise resolving when fullscreen is toggled
   */
  toggleFullscreen(): Promise<void>;
}
