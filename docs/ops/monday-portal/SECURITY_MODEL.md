# Monday client portal — security model

Scope: `spatial_project_shares` (this branch, net new) plus the existing
`spatial_share_tokens` pattern it is modeled on (rc2 base, already in
production-track code, audited here for correctness before reuse).

## Roles

- **Org**: `owner` / `admin` / `member` — existing `organization_members`, untouched.
- **Project**: creator/editor = org member with `access.canAuthor` (existing
  `resolveSpatialAccess`); internal viewer = org member, `canView` only.
- **Client / consultant**: not an app account. Reaches the project only through
  a `spatial_project_shares` token — no login, no `organization_members` row.

## Share token

- 24 random bytes (192 bits), base64url — `mintShareToken()`, well above the
  128-bit floor `tokenMeetsEntropyFloor()` checks.
- **Stored hashed only.** `token_hash = sha256(token)`, unique-indexed. The raw
  token is returned to the creator exactly once, in the create response, and
  is never persisted anywhere else — the database cannot leak a usable secret.
- Password is separate and optional: `scrypt$<salt>$<hash>` via the existing
  `hashSharePassword`/`verifySharePassword` (`lib/slatedrop/share-password.ts`).
  Unlock sets an **HttpOnly, Secure (prod), SameSite=Lax** cookie carrying an
  HMAC proof (`createShareUnlockProof`) of `tokenHash:passwordHash` — the
  password itself is never stored client-side, and the proof is useless
  against a different token or a rotated password.
- `expires_at`, `max_views`, `is_revoked` are checked by one function,
  `shareDenied()`, shared with the walkthrough share path — one place to get
  denial logic right instead of two.

## No enumeration surface

- `GET /api/portal/[token]` returns the **same** `{error:"unavailable"}` 404
  body for "token does not exist", "revoked", "expired", and "over max
  views" — indistinguishable from outside. Only a live-but-locked share adds
  `needsPassword: true` at 401, which is required for the unlock UI and
  reveals nothing about the project.
- Wrong password returns the identical denial body, not "wrong password" —
  no confirmation that a password exists versus not.
- The portal never takes a numeric or sequential id in the URL — only the
  opaque token — so there is nothing to increment.

## Rate limiting

- `createRateLimiter` (Upstash sliding window, IP-keyed): unlock 8/60s,
  resolver 30/60s, item creation 12/60s — same limiter used by the proven
  walkthrough share path, new prefixes (`portal:unlock`, `portal:resolve`,
  `portal:items:create`) so they don't share a bucket with unrelated routes.
  **Gap carried over from the base branch**: the limiter no-ops when Upstash
  env vars are absent (documented "local dev is not blocked" — production
  must have Upstash configured; this is not new to this branch).

## Master files never reach a client-scoped route

- The portal media proxy (`/api/portal/[token]/media`) calls
  `selectDerivativeKey(clip, kind, "client", false)` — `allowMaster` is a
  hardcoded `false` literal, not a variable, and `kind === "master"` is
  rejected before the token is even resolved. There is no code path in this
  route that can return `master_key`.
- Every media request re-validates that the requested clip's walkthrough
  belongs to the **same project** as the share token
  (`wt.project_id !== row.project_id` → deny) — a portal token for Project A
  cannot read a clip id copied from Project B even if guessed.

## Visibility grants (new: `spatial_project_share_grants`)

- One row per share, defaults conservative: `can_see_internal_items = false`,
  `visible_item_visibilities = ['client']`. A share created with defaults
  never sees an `internal`-visibility item or an internal document —
  filtering happens server-side in `loadPortalData`, not by hiding rows in
  the client after fetching everything.
- `can_see_documents`, `can_comment`, `can_create_items`, `can_measure` are
  explicit booleans the creator sets at share time (`SharePortalDialog`) —
  a "read-only, no comments" link is one unchecked box, not a code change.

## RLS

- `spatial_project_shares` and `spatial_project_share_grants`: org-member-only
  policies (`sps_org_all`, `sps_grants_org_all`) — anon clients have **no**
  RLS path to these tables at all. Every public read goes through
  `loadProjectShareRow`, which uses the service-role admin client and
  performs the token/expiry/password checks in application code before
  touching any other table. This mirrors `spatial_share_tokens`, which has
  the same shape and has already been through one security pass
  (`spatial_privacy_publish` migration hashed a previously-plaintext token
  column).
- `spatial_project_items` / `*_locators` / `*_comments` / `*_activity` /
  `*_documents` (ported from `feature/spatial-project-items`): org-member RLS
  only, no anon policy — the same "service role + app-level check" shape.
  Public writes (portal "ask a question") go through
  `/api/portal/[token]/items`, which re-derives `org_id`/`project_id` from
  the **validated share row**, never from client input, before inserting.

## CSRF / CSP / embedding

- All state-changing portal routes are `POST` with `Content-Type: application/json`
  bodies read server-side — no state change is reachable via a plain link or
  `<img>` tag (the classic GET-CSRF hole). The unlock cookie is `SameSite=Lax`,
  which blocks it being sent on cross-site POST.
- Not yet done in this branch: an explicit `frame-ancestors` / CSP header for
  `/portal/*` and `/api/portal/*`. The existing `/portal` (SlateDrop guest
  view) middleware already sets `frame-ancestors 'none'`; this branch's new
  `/portal/[token]` route sits at the same path prefix and should inherit
  that middleware rule, but I have not traced the middleware matcher to
  confirm it covers the new dynamic segment — **flagged as a pre-launch
  check, not verified in this session.**
- `allow_embed` exists on `spatial_project_shares` as a forward-looking column
  for a future branded iframe embed SDK; nothing in this branch reads it yet,
  so embedding is not enabled by this work.

## Audit trail

- `recordPortalAudit()` writes to the existing `org_usage_events` table with
  `resource_type: "project"` (kept separate from `recordWalkthroughAudit`'s
  `"spatial_walkthrough"` so a review of usage events isn't misled about what
  was accessed). Events recorded: `portal_opened`, `portal_access_code_success`,
  `portal_access_code_failure`, `portal_item_created`, `portal_share_created`,
  `portal_share_revoked`. `portal_comment_created` and
  `portal_document_opened` are typed but not yet emitted — comment/document
  read-tracking wasn't built this session (see inventory: threaded reply is
  a gap).

## What was audited, not built, in this branch

- `spatial_share_tokens` unlock/resolve/rate-limit code (base branch) was
  read end to end while designing the mirror in `project-share.ts` — no
  enumeration difference found between "revoked" and "not found", token
  comparison is hash-based (not a raw string `WHERE`), and the audit call is
  best-effort (wrapped in `try/catch`) so a logging failure never blocks a
  legitimate view. No changes were made to that code.

## Known gaps (explicit, not hidden)

1. Portal-side comment **replies** are not built — only item **creation**.
   Creator-side comments (existing, authed) work; anonymous client replies
   need a new guest-scoped comments route, same shape as `/api/portal/[token]/items`.
2. `frame-ancestors` for `/portal/*` not verified against middleware.
3. File/voice attachment on portal-created items is intentionally out —
   only the walkthrough-scoped `/ask` route (ported, unchanged) supports it.
4. No email delivery wired to `recipientEmail` — the field is captured and
   stored, but no email is sent yet (see inventory: reuse `lib/email` next).
