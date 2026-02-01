/**
 * Domain Validation: System Schemas
 *
 * Valibot schemas for runtime validation of system entities.
 *
 * @module domain/validation/system-schemas
 */

import * as v from 'valibot';

/**
 * Schema for SystemStatus entity
 */
export const SystemStatusSchema = v.object({
  cpu_usage: v.number(),
  memory_usage: v.number(),
  gpu_usage: v.optional(v.number()),
  fps: v.optional(v.number()),
});

/**
 * Type inference from schema
 */
export type SystemStatusSchemaType = v.InferOutput<typeof SystemStatusSchema>;
