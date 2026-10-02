/**
 * Staff product scopes are retired. `market` and `athlete360` were internal
 * grants for products that are not part of Slate360's services work.
 * Nothing replaces them. New grants store an empty scope list.
 */
export function sanitizeStaffAccessScope(_value: unknown): string[] {
  return [];
}
