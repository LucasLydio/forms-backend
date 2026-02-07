export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type SuccessResponse<T> = {
  success: true;
  data: T;
  meta?: { pagination?: PaginationMeta };
  message?: string;
};
