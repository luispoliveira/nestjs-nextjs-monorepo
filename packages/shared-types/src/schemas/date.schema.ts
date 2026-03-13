import z from 'zod';

/**
 * Codec that accepts Prisma `Date` objects at runtime and encodes them as ISO 8601
 * strings in responses. Using a codec avoids "Transforms cannot be represented in
 * JSON Schema" errors — the output schema (`z.iso.datetime()`) is used for OpenAPI
 * generation while `encode` handles the Date → string conversion at serialization time.
 *
 * Usage: pair with `createZodDto(schema, { codec: true })` on the entity class.
 */
export const DateToISOString = z.codec(z.iso.datetime(), z.date(), {
  decode: (val: string) => new Date(val),
  encode: (val: Date) => val.toISOString(),
});

/**
 * Nullable + optional variant for soft-delete / audit fields (e.g. `deletedAt`).
 */
export const NullableDateToISOString = DateToISOString.nullable().optional();
