/**
 * Shared read filters for site_walk_items.
 * All list/read selectors for active capture data must exclude soft-deleted rows.
 */

type NullableFilterQuery<T> = {
  is(column: string, value: null): T;
};

/** Apply `deleted_at IS NULL` to a Supabase query builder chain. */
export function excludeDeletedSiteWalkItems<T extends NullableFilterQuery<T>>(query: T): T {
  return query.is("deleted_at", null);
}
