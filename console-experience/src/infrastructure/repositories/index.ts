/**
 * Infrastructure Repositories Barrel Export
 *
 * Central export point for all repository implementations.
 *
 * @module infrastructure/repositories
 */

// Tauri implementations (production)
export { TauriGameRepository } from './tauri-game-repository';
export { TauriSystemRepository } from './tauri-system-repository';
export { TauriWindowRepository } from './tauri-window-repository';

// Mock implementations (testing)
export { MockGameRepository } from './mock-game-repository';
export { MockSystemRepository } from './mock-system-repository';
export { MockWindowRepository } from './mock-window-repository';
