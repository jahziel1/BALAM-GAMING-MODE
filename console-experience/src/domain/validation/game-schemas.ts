/**
 * Domain Validation: Game Schemas
 *
 * Valibot schemas for runtime validation of game entities.
 * Ensures data from backend matches expected types.
 *
 * @module domain/validation/game-schemas
 */

import * as v from 'valibot';

/**
 * Schema for GameSource enum
 */
export const GameSourceSchema = v.picklist(['Steam', 'Epic', 'Xbox', 'Manual']);

/**
 * Schema for Game entity
 */
export const GameSchema = v.object({
  id: v.string(),
  raw_id: v.string(),
  title: v.string(),
  path: v.string(),
  source: GameSourceSchema,
  image: v.nullable(v.string()),
  hero_image: v.nullable(v.string()),
  logo: v.nullable(v.string()),
  last_played: v.nullable(v.number()),
});

/**
 * Schema for ActiveGame entity
 */
export const ActiveGameSchema = v.object({
  game: GameSchema,
  pid: v.number(),
});

/**
 * Schema for array of games
 */
export const GamesArraySchema = v.array(GameSchema);

/**
 * Type inference from schemas
 */
export type GameSchemaType = v.InferOutput<typeof GameSchema>;
export type ActiveGameSchemaType = v.InferOutput<typeof ActiveGameSchema>;
export type GamesArraySchemaType = v.InferOutput<typeof GamesArraySchema>;
