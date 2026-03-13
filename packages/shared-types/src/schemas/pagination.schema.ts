import z from 'zod';

const sortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof sortOrderSchema>;

export const paginationSchema = z
  .object({
    skip: z.coerce.number().min(0).default(0),
    take: z.coerce.number().min(1).max(100).default(20),
    sortBy: z.string().default('id'),
    sortOrder: sortOrderSchema.default('asc'),
  })
  .meta({ id: 'Pagination' });
