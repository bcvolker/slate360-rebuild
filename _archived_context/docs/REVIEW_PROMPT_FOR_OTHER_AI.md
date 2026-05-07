# Review Prompt for Second AI Assistant

> Paste everything below this line into the other assistant. It does not need
> repository access — the prompt is self-contained.

---

You are a senior code reviewer auditing a feature branch on the **Slate360**
codebase (Next.js 15 + React 19 + TypeScript + Tailwind v4 + Supabase + Stripe).
The branch is `refactor/brand-token-migration-core-surfaces` (PR #7) on
`bcvolker/slate360-rebuild`. HEAD commit is `624d674`.

I need a hard, skeptical review. The previous round of suggestions you produced
had to be ~80% rewritten because helpers were invented (wrong import paths,
wrong function signatures, wrong DB columns). Do **not** assume API shapes —
verify against the project's real conventions listed below before you flag
anything as a bug.

## Project conventions you MUST hold the code to

1. **Auth wrappers** live in `lib/server/api-auth.ts`:
   - `withAuth(req, handler)` — handler signature `(req, ctx: AuthedContext) => Promise<Response>`
   - `withProjectAuth(req, ctx, handler)` — same shape, plus project access check
   - `AuthedContext` exposes: `userId`, `orgId | null`, `role`, `isAdmin`,
     `isSlateCeo`, `entitlements`, `permissions`. **No `tier` field, no
     `context.user`** — read tier from `entitlements.tier`.
2. **Response helpers** live in `lib/server/api-response.ts`. The available
   functions are exactly: `ok`, `created`, `noContent`, `badRequest`,
   `unauthorized`, `forbidden`, `notFound`, `conflict`, `serverError`. There
   is no `successResponse` / `errorResponse`.
3. **Supabase clients**:
   - `createClient()` from `@/lib/supabase/client` — browser
   - `createServerSupabaseClient()` from `@/lib/supabase/server` — server
   - `createAdminClient()` from `@/lib/supabase/admin` — service role
4. **Projects table** uses `created_by` (not `owner_id`).
5. **Folder writes** use `project_folders` (not `file_folders`).
6. **Entitlements** come only from `lib/entitlements.ts` via `getEntitlements()`.
   Tier order: `trial < standard < business < enterprise`. Legacy tier names
   `creator`/`model` map to `standard`.
7. **Hard rules**:
   - No `any` (use `unknown` + narrow).
   - No production `.ts/.tsx` file > 300 lines.
   - One component per file, one hook per file.
   - Server components first; `"use client"` only when required.
   - Imports flow: `lib/` → `components/` → `app/`.

## What to review

The work added in commits **`1e63650`**, **`99cf0e7`**, plus the live database
migrations applied this session.

### Commit `1e63650` — Collaborator invite end-to-end

New / modified files:

- `lib/sms.ts` — Twilio REST (no SDK dep) via `fetch()`. Validates E.164,
  returns `{ ok: true, sid } | { ok: false, reason }`.
- `lib/email-collaborators.ts` — `sendCollaboratorInviteEmail()` using the
  HTML wrapper from `lib/email.ts`. Escapes all interpolated user input.
- `lib/server/collaborator-data.ts` — `loadProjectPeople(projectId, orgId)`
  returns `{ members, pendingInvites, leadershipViewers }`. Hydrates user
  profiles with a single `.in()` query.
- `app/api/projects/[projectId]/collaborators/route.ts` — GET people + seat usage.
- `app/api/projects/[projectId]/collaborators/invite/route.ts` — POST, zod-validated,
  runs `assertCanInviteCollaborator`, mints `invitation_tokens` row
  (max_redemptions=1, 14-day TTL), inserts the invite, dispatches email/sms/both/link.
  Returns `{ inviteId, inviteUrl, qrPayload, delivery }`.
- `app/api/projects/[projectId]/collaborators/[inviteId]/revoke/route.ts` — POST.
- `app/api/projects/[projectId]/collaborators/[inviteId]/resend/route.ts` — POST.
- `app/(dashboard)/projects/[projectId]/people/page.tsx` — server component,
  calls `loadProjectPeople` directly (no internal HTTP).
- `components/projects/ProjectPeopleView.tsx` — client view, three sections
  (Project members / Outside collaborators with seat counter / Leadership viewers).
- `components/projects/PeopleSection.tsx` — primitive list section.
- `components/projects/CollaboratorInviteModal.tsx` — channel-aware form
  (email / sms / both / link). Disables when at seat limit.
- `.env.example` — `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM`.

### Commit `99cf0e7` — Collaborator shell + view selector + permissions + app-access guard

New / modified files:

- `app/(collaborator)/collaborator/layout.tsx` — calls `isCollaboratorOnly(user.id)`;
  bounces users WITH any `organization_members` row to `/dashboard`; otherwise
  renders `CollaboratorShell`.
- `app/(collaborator)/collaborator/page.tsx` — landing, lists projects from
  `listCollaboratorProjects()`.
- `components/collaborator/CollaboratorShell.tsx` — stripped sidebar
  (My projects / Shared files / Comments / Account) + persistent cobalt upgrade banner.
- `lib/server/collaborator-mode.ts` — `isCollaboratorOnly()` + `listCollaboratorProjects()`.
- `lib/server/invites.ts` — redemption now routes invitees with no org to
  `/collaborator`, others to `/projects/{id}`.
- `lib/server/project-view.ts` — `readProjectViewMode()` cookie reader returns
  `"my" | "owner" | "leadership"`.
- `app/api/projects/view-mode/route.ts` — POST sets the cookie (sameSite=lax, 30d).
- `components/projects/ProjectViewSelector.tsx` — client `<select>` POSTs +
  `router.refresh()`.
- `app/(dashboard)/projects/[projectId]/layout.tsx` — adds People tab, mounts
  `<ProjectViewSelector>` next to status pill, computes `allowedModes` from role
  (viewer→`["leadership"]`, admin→all 3, member→`["my","owner"]`).
- `lib/server/org-context.ts` — exports `PERMISSION_KEYS`, `PermissionKey`,
  `MemberPermissions`, `resolvePermissions(raw, tier, isAdmin)`. Adds
  `permissions: MemberPermissions` to `ServerOrgContext` on all four return paths
  (no-user / no-membership / success / catch). Membership query selects the
  `permissions` column.
- `lib/server/api-app-access.ts` — `APP_ACCESS_KEYS = ['site_walk','tours','design_studio','content_studio']`,
  `userHasAppAccess(userId, orgId, appKey)` (admin/owner pass implicitly),
  `withAppAccess(appKey, req, handler)` returns 403 `No seat assigned for {app}`.

### Live database migrations applied this session

Applied to project `hadnfcenpcfaeclczsmm`:

1. `supabase/migrations/20260306_slate360_staff.sql` — staff allowlist for Operations Console.
2. `supabase/migrations/20260418080828_create_invitation_tokens.sql` — generic invite token store.
3. `supabase/migrations/20260419120000_project_collaborator_invites.sql` — collaborator invite store.
4. `supabase/migrations/20260419130000_org_member_app_access.sql` — per-app seat assignment.
5. `supabase/migrations/20260419130001_org_members_permissions.sql` — adds `permissions jsonb` to `organization_members`.

Verification confirmed all 5 objects exist on live.

## What I want you to actually do

Produce a single review report in this exact structure:

```
## CRITICAL (blocks merge)
- [file:line] reason — must cite the exact line in the file

## HIGH (should fix this PR)
- ...

## MEDIUM (next PR ok)
- ...

## NITS / STYLE
- ...

## Things that look right (call out non-obvious wins)
- ...
```

For every CRITICAL or HIGH finding, include:
- The exact file path and line number
- Why it's wrong (cite the convention from this prompt or general best practice)
- A concrete fix (code snippet OK, but only if you're sure of the API shape)

## Specific things to scrutinize hard

1. **RLS gaps**: do the 3 new tables (`project_collaborator_invites`,
   `org_member_app_access`, `organization_members.permissions`) have policies
   that prevent a project member from one org reading invites for another org?
2. **Auth bypass**: is there any path where `withProjectAuth` is skipped, or
   where `orgId` is trusted from the request body instead of the context?
3. **Token lifetime**: `invitation_tokens` is set to 14-day TTL +
   `max_redemptions=1`. Confirm the redemption code actually decrements/marks
   it and doesn't leave a window for double-use.
4. **Race conditions**: invite POST inserts the token then the invite row.
   What happens if the second insert fails? Is the token orphaned?
5. **PII in logs**: any `console.log` in the SMS/email path that prints phone
   numbers or full URLs?
6. **Missing CSRF / open redirect**: invite redemption redirect targets — are
   they validated against an allowlist?
7. **File-size cap (300 lines)**: did any of the new files cross it?
8. **`any` leakage**: any `as any` or untyped destructure?
9. **Server/client boundary**: `CollaboratorShell` claims to be server-rendered
   but is it actually a client component? Are server-only imports leaking?
10. **Marketing homepage drift**: `components/marketing-homepage.tsx`
    advertises tiers `Free Trial / Field Pro Bundle (Custom) / Enterprise`
    while `lib/entitlements.ts` defines `trial / standard $149 / business $499 /
    enterprise`. Flag this as a positioning/marketing issue (not a code bug).

## Out of scope

- Visual design / palette decisions — already locked.
- Member & Roles UI in `MyAccountShell` — explicitly TODO, do not flag.
- vitest setup — explicitly TODO, do not flag the absence of tests.
- Any file outside the two commits above and the 5 migrations.

When you're done, end with a one-line verdict:
**`VERDICT: SAFE TO MERGE` / `MERGE WITH FIXES` / `DO NOT MERGE`**
and the count of CRITICAL / HIGH findings.
