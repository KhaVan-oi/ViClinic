const MAX_QUERY_OFFSET = 2_147_483_647;

export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export function normalizePagination(
  input?: PaginationInput,
  defaultPageSize = 20,
  maxPageSize = 100
): { page: number; pageSize: number; skip: number; take: number; } {
  const requestedPage = Number(input?.page);
  const requestedSize = Number(input?.pageSize);
  const rawSize = Number.isFinite(requestedSize) ? Math.floor(requestedSize) || defaultPageSize : defaultPageSize;
  const pageSize = Math.min(maxPageSize, Math.max(1, rawSize));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 &&
    requestedPage <= Math.floor(MAX_QUERY_OFFSET / pageSize) + 1 ? requestedPage : 1;
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

export function buildPaginatedResult<T>(
  items: T[],
  totalItems: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

export function parsePositiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 && id <= 2_147_483_647 ? id : null;
}

export function singleSearchParams(params: Record<string, unknown>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === "string" ? value : undefined]));
}

export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").replace(/[đĐ]/g, "d").toLocaleLowerCase("vi").trim().replace(/\s+/g, " ");
}
