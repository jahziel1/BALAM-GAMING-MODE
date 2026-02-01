/**
 * Infrastructure: Tauri System Repository
 *
 * Implementation of SystemRepository using Tauri IPC.
 *
 * @module infrastructure/repositories/tauri-system-repository
 */

import { invoke } from '@tauri-apps/api/core';

import type { SystemStatus } from '../../domain/entities/system-status';
import type { SystemRepository } from '../../domain/repositories/system-repository';

/**
 * Tauri IPC implementation of SystemRepository
 */
export class TauriSystemRepository implements SystemRepository {
  async getStatus(): Promise<SystemStatus> {
    return invoke<SystemStatus>('get_system_status');
  }
}
