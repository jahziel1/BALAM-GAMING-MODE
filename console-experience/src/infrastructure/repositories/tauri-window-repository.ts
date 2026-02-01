/**
 * Infrastructure: Tauri Window Repository
 *
 * Implementation of WindowRepository using Tauri window API.
 *
 * @module infrastructure/repositories/tauri-window-repository
 */

import { getCurrentWindow } from '@tauri-apps/api/window';

import type { WindowRepository } from '../../domain/repositories/window-repository';

/**
 * Tauri window API implementation of WindowRepository
 */
export class TauriWindowRepository implements WindowRepository {
  private window = getCurrentWindow();

  async minimize(): Promise<void> {
    await this.window.minimize();
  }

  async close(): Promise<void> {
    await this.window.close();
  }

  async toggleFullscreen(): Promise<void> {
    const isFullscreen = await this.window.isFullscreen();
    await this.window.setFullscreen(!isFullscreen);
  }
}
