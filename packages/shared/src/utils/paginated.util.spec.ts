import { PaginatedUtil } from './paginated.util';

describe('PaginatedUtil', () => {
  describe('getPaginatedResponse', () => {
    const items = ['a', 'b', 'c'];

    it('should return items and correct meta', () => {
      const result = PaginatedUtil.getPaginatedResponse(items, 30, 0, 10);
      expect(result.items).toBe(items);
      expect(result.meta).toMatchObject({
        total: 30,
        totalPages: 3,
        page: 1,
        pageSize: 10,
      });
    });

    it('should calculate page correctly for non-zero skip', () => {
      const result = PaginatedUtil.getPaginatedResponse(items, 30, 20, 10);
      expect(result.meta.page).toBe(3);
    });

    it('should return totalPages = 0 when take is 0', () => {
      const result = PaginatedUtil.getPaginatedResponse(items, 30, 0, 0);
      expect(result.meta.totalPages).toBe(0);
      expect(result.meta.page).toBe(1);
    });

    it('should handle empty items array', () => {
      const result = PaginatedUtil.getPaginatedResponse([], 0, 0, 10);
      expect(result.items).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should ceil totalPages for non-divisible totals', () => {
      const result = PaginatedUtil.getPaginatedResponse(items, 25, 0, 10);
      expect(result.meta.totalPages).toBe(3);
    });
  });
});
