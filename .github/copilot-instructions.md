# Slate360 — Copilot Instructions

Before making any code change, read `CODEBASE_HEALTH_BLUEPRINT.md` in the project root.

## Quick Rules

1. **No file > 300 lines** — extract sub-components/hooks/utils before adding code.
2. **No `any`** — use `unknown` + narrowing, generics, or proper interfaces.
3. **No duplicated auth** — use `withAuth()` / `withProjectAuth()` from `@/lib/server/api-auth`.
4. **Types from `lib/types/`** — import `ProjectRouteContext` from `@/lib/types/api`, not inline.
5. **Response helpers** — use `ok()`, `badRequest()`, etc. from `@/lib/server/api-response`.
6. **Server components first** — only `"use client"` when the component needs browser APIs or state.
7. **Single responsibility** — one component per file, one hook per file.
8. **Imports flow downward** — `lib/` → `components/` → `app/`. Never import from `app/` into `lib/`.
9. **Update issue ledger** when fixing runtime bugs: `PROJECT_RUNTIME_ISSUE_LEDGER.md`.
10. **Run `get_errors`** after edits to verify no TypeScript errors were introduced.

## API Route Template

```typescript
import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, serverError } from "@/lib/server/api-response";
import type { ProjectRouteContext } from "@/lib/types/api";

export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { data, error } = await admin.from("table").select("*").eq("project_id", projectId);
    if (error) return serverError(error.message);
    return ok({ items: data });
  });
```

## Key Files

- `CODEBASE_HEALTH_BLUEPRINT.md` — full rules, phases, conventions
- `PROJECT_RUNTIME_ISSUE_LEDGER.md` — runtime bug tracker
- `lib/server/api-auth.ts` — `withAuth()`, `withProjectAuth()` wrappers
- `lib/server/api-response.ts` — `ok()`, `badRequest()`, `unauthorized()`, etc.
- `lib/types/api.ts` — `ProjectRouteContext`, `ApiErrorPayload`
- `lib/projects/access.ts` — `resolveProjectScope()`, `getScopedProjectForUser()`
- `lib/server/org-context.ts` — `resolveServerOrgContext()`
