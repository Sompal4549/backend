import { SortOrder } from 'mongoose';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export const getPagination = ({ page = 1, limit = 10, sortBy = 'orderBy', order = 'asc' }: PaginationOptions) => {
  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.max(Number(limit) || 10, 1);
  const sortOrder: SortOrder = order === 'asc' ? 1 : -1;

  const sort: any = sortBy === 'orderBy'
    ? { orderBy: sortOrder, createdAt: -1 }
    : { [sortBy]: sortOrder };

  return {
    skip: (parsedPage - 1) * parsedLimit,
    limit: parsedLimit,
    sort,
    page: parsedPage,
  };
};
