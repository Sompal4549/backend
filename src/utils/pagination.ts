import { SortOrder } from 'mongoose';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export const getPagination = ({ page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' }: PaginationOptions) => {
  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.max(Number(limit) || 10, 1);
  const sortOrder: SortOrder = order === 'asc' ? 1 : -1;

  return {
    skip: (parsedPage - 1) * parsedLimit,
    limit: parsedLimit,
    sort: { [sortBy]: sortOrder },
    page: parsedPage,
  };
};
