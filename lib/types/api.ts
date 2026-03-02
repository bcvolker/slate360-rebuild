/**
 * Shared API route types — single source of truth.
 *
 * Replaces 12+ inline copies of RouteContext across project API routes.
 * Import from "@/lib/types/api" in every route.ts file.
 */

/* ─── Route context types ──────────────────────────────────── */

/** Standard context for `/api/projects/[projectId]/...` routes */
export type ProjectRouteContext = {
  params: Promise<{ projectId: string }>;
};

/** Context for routes with a single dynamic `[id]` segment */
export type IdRouteContext = {
  params: Promise<{ id: string }>;
};

/** Context for routes with no dynamic segments */
export type StaticRouteContext = {
  params: Promise<Record<string, never>>;
};

/* ─── Response types ───────────────────────────────────────── */

/** Standard error payload — always `{ error: string }` */
export type ApiErrorPayload = {
  error: string;
};

/** Standard success envelope — generic data + optional error */
export type ApiResponse<T> = T & {
  error?: never;
};

/* ─── Backwards compatibility alias ────────────────────────── */

/**
 * @deprecated Use `ProjectRouteContext` instead.
 * Kept temporarily so routes can be migrated incrementally.
 */
export type RouteContext = ProjectRouteContext;
