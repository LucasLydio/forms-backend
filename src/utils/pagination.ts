export type PaginationInput = {
  page?: unknown;
  pageSize?: unknown;
};

export function pagination(pageRaw: unknown, pageSizeRaw: unknown) {
  const page = Math.max(1, Number(pageRaw ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeRaw ?? 10) || 10));

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return { page, pageSize, skip, take };
}
