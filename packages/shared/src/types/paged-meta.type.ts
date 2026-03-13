import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const PagedMetaSchema = z.object({
  page: z.number().default(1),
  pageSize: z.number().default(0),
  totalPages: z.number().default(0),
  total: z.number().default(0),
});

export class PagedMetaType extends createZodDto(PagedMetaSchema) {
  constructor() {
    super();
    this.page = 1;
    this.pageSize = 0;
    this.totalPages = 0;
    this.total = 0;
  }

  static getPageMeta(total: number, skip: number, take: number): PagedMetaType {
    return {
      total,
      totalPages: take > 0 ? Math.ceil(total / take) : 0,
      page: take > 0 ? Math.floor(skip / take) + 1 : 1,
      pageSize: take,
    };
  }
}
