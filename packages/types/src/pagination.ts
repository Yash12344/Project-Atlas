import { z } from 'zod';

/**
 * Cursor pagination, not offset.
 *
 * `OFFSET n` makes the database walk and discard n rows, so page 5000 costs
 * far more than page 1, and concurrent inserts shift rows between pages.
 * A keyset cursor is O(log n) at every page and stable under writes. Since ids
 * are UUIDv7 and therefore time-ordered, the id doubles as the cursor.
 */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  cursor: z.string().min(1).max(64).optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface Page<T> {
  readonly data: readonly T[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

/**
 * Takes `limit + 1` rows from a query and folds the extra row into the cursor.
 * Keeping this in one place stops each caller from inventing its own
 * off-by-one.
 */
export function toPage<T extends { id: string }>(rows: readonly T[], limit: number): Page<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data.at(-1);
  return {
    data,
    hasMore,
    nextCursor: hasMore && last ? last.id : null,
  };
}
