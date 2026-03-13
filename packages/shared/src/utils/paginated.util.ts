import { PagedMetaType } from '../types';

/**
 * Utility class for building paginated API responses.
 */
export class PaginatedUtil {
  /**
   * Constructs a paginated response with items and metadata.
   *
   * @param items - The array of items for the current page
   * @param total - Total number of items across all pages
   * @param skip - Number of items skipped (offset)
   * @param take - Number of items per page (limit)
   * @returns Object containing items array and pagination metadata
   */
  static getPaginatedResponse<T>(
    items: T[],
    total: number,
    skip: number,
    take: number,
  ) {
    return {
      items,
      meta: PagedMetaType.getPageMeta(total, skip, take),
    };
  }
}
