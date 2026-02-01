/**
 * Infrastructure: Mock Window Repository
 *
 * Mock implementation for testing window operations without Tauri runtime.
 *
 * @module infrastructure/repositories/mock-window-repository
 */

import type { WindowRepository } from '../../domain/repositories/window-repository';

/**
 * Mock implementation of WindowRepository for testing
 */
export class MockWindowRepository implements WindowRepository {
  private isMinimized = false;
  private isClosed = false;
  private isFullscreen = false;

  async minimize(): Promise<void> {
    this.isMinimized = true;
    return Promise.resolve();
  }

  async close(): Promise<void> {
    this.isClosed = true;
    return Promise.resolve();
  }

  async toggleFullscreen(): Promise<void> {
    this.isFullscreen = !this.isFullscreen;
    return Promise.resolve();
  }

  /**
   * Test helper: Get window state
   */
  getState(): {
    isMinimized: boolean;
    isClosed: boolean;
    isFullscreen: boolean;
  } {
    return {
      isMinimized: this.isMinimized,
      isClosed: this.isClosed,
      isFullscreen: this.isFullscreen,
    };
  }

  /**
   * Test helper: Reset window state
   */
  reset(): void {
    this.isMinimized = false;
    this.isClosed = false;
    this.isFullscreen = false;
  }
}
