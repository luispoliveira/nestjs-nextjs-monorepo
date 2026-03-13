import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { PagedMetaSchema } from './paged-meta.type';

/**
 * Creates a paginated Zod schema wrapping the given item schema.
 *
 * @example
 * ```typescript
 * const UserSchema = z.object({ id: z.number(), name: z.string() });
 * const PaginatedUserSchema = PaginatedSchema(UserSchema);
 * class PaginatedUserDto extends createZodDto(PaginatedUserSchema) {}
 * ```
 *
 * @param itemSchema - The Zod schema for the items in the paginated response
 * @returns A Zod schema representing a paginated response
 */
export function PaginatedSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    meta: PagedMetaSchema,
  });
}

/**
 * Creates a paginated DTO class from a Zod item schema.
 *
 * @example
 * ```typescript
 * const UserSchema = z.object({ id: z.number(), name: z.string() });
 * const PaginatedUserDto = Paginated(UserSchema);
 * ```
 *
 * @param itemSchema - The Zod schema for the items in the paginated response
 * @returns A class extending createZodDto with the paginated schema
 */
export function Paginated<T extends z.ZodTypeAny>(itemSchema: T) {
  const schema = PaginatedSchema(itemSchema);
  return createZodDto(schema);
}
