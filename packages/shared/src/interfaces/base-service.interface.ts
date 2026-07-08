export interface BaseService<T> {
  findOneById(id: number): Promise<T>;
}
