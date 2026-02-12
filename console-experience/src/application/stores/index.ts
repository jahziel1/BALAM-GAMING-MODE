/**
 * Application Stores Barrel Export
 *
 * Central export point for all Zustand stores using Slices Pattern.
 *
 * ## Migration to Slices Pattern (2024-2026)
 * - Main export: `createAppStore` (consolidated store with all slices)
 * - Legacy exports: Individual stores (deprecated, kept for backward compatibility)
 *
 * @module application/stores
 */

// ===== NEW: Consolidated App Store (Slices Pattern) =====
export { type AppStore, type AppStoreHook, createAppStore } from './app-store';

// ===== Slice Types =====
export type { GameSlice } from './slices/game-slice';
export type { OverlaySlice, OverlayType } from './slices/overlay-slice';
export type {
  PerformanceOverlayConfig,
  PerformanceOverlayMode,
  PerformanceOverlayPosition,
  PerformanceSlice,
} from './slices/performance-slice';
export type { SystemSlice } from './slices/system-slice';

// ===== LEGACY: Individual Stores (Deprecated) =====
// These are kept for backward compatibility during migration
// @deprecated Use createAppStore instead
export type { GameStore } from './game-store';
export { createGameStore } from './game-store';

// @deprecated Use createAppStore instead
export { useOverlayStore } from './overlay-store';

// @deprecated Use createAppStore instead
export type { SystemStore } from './system-store';
export { createSystemStore } from './system-store';
