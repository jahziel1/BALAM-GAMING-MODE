/**
 * Domain Layer Barrel Export
 *
 * Central export point for entire domain layer.
 * Re-exports entities, repositories, and validation schemas.
 *
 * @module domain
 */

// Entities
export type { ActiveGame, Game, GameSource } from './entities';
export type { SystemStatus } from './entities';

// Errors
export type { GameLaunchError, LaunchFailureReason } from './errors/game-launch-error';
export { getErrorIcon, getErrorSeverity, getFailureDescription } from './errors/game-launch-error';

// Repository interfaces (ports)
export type { GameRepository } from './repositories';
export type { SystemRepository } from './repositories';
export type { WindowRepository } from './repositories';

// Validation schemas
export type {
  ActiveGameSchemaType,
  GamesArraySchemaType,
  GameSchemaType,
  SystemStatusSchemaType,
} from './validation';
export {
  ActiveGameSchema,
  GamesArraySchema,
  GameSchema,
  GameSourceSchema,
  SystemStatusSchema,
} from './validation';
