# Slate360 Agent Guardrails

Slate360 is not a demo app. It is a production SaaS product being prepared for iOS and Android app-store submission.

## Release Scope

- Site Walk is the only fully visible and usable app for the first app-store release.
- Other apps must remain hidden until a later release.
- Keep App Store mode clean and do not expose unfinished modules through authenticated app shell navigation.
- Do not add Coming Soon, demo, fake, placeholder, or beta/test language inside authenticated app surfaces.

## Product Quality Rules

- No vibe-coded filler content.
- No fake metrics.
- No dead buttons.
- No mock data in production UI.
- Use the Graphite Glass design system (`docs/design/GRAPHITE_GLASS.md` is canonical). Amber accents are banned in authenticated surfaces — `npm run guard:design` enforces this.
- Use canonical app shell components for authenticated surfaces.
- Do not mix UI redesigns with backend or persistence fixes.

## Git Rules

### Live-main workflow (active pre-user development)

During early development (no external users), agents may **work directly on `main`** and push to production after validation so the owner can test on the live PWA at https://www.slate360.ai.

Read `SLATE360_LIVE_MAIN_WORKFLOW.md` before every session.

- Default branch: **`main`** unless the user explicitly requests a feature branch.
- Do **not** use Vercel preview links unless explicitly asked.
- Small, reversible commits; validate before every push (`typecheck`, `build`, `guard:architecture`, `guard:design`).
- After push: confirm production via `/api/deploy-info` and provide cache-busted URLs.
- Restore point: branch `backup/pre-live-main-workflow` / tag `pre-live-main-workflow`.

Use **feature branches** for high-risk work: migrations, auth/middleware, billing, Trigger.dev, destructive refactors, or post-launch user-facing risk.

### General

- Do not use `git add .`.
- Keep changes narrow and reviewable.

## Site Walk and Plan Processing Rules

- Do not rasterize PDFs inside Vercel/Next.js API routes.
- Trigger.dev PDF rasterization is currently working; do not disturb it unless the task proves it is directly involved.
- Heavy processing belongs outside Vercel routes.
- Mobile Site Walk must use server-generated plan imagery, not browser-side construction-PDF rendering.
- Site Walk capture is mobile-first and must support iOS/Android physical-device testing.
- Plan pins must use one authoritative ID lifecycle.

## Validation Rules

Use **validation tiers** — do not require a full-repo typecheck for every isolated change.

### Tier A — isolated / marketing / single-feature (local)

Before marking work complete:

1. `npm run typecheck:changed` (default: git-changed `.ts`/`.tsx` vs `main`) **or** scope a directory:
   `npm run typecheck:changed -- app/(public)`
2. ESLint on staged files (via `lint-staged` on commit, or `npx eslint <paths>`)
3. `npm run build`
4. Relevant guardrails for the touched area (`guard:architecture`, etc.)

### Tier B — full type safety (CI / pre-merge to `main`)

Full project typecheck runs in GitHub Actions (`.github/workflows/typecheck.yml`) on every push/PR to `main` and `feature/digital-twin-lite`:

```bash
NODE_OPTIONS=--max-old-space-size=12288 npm run typecheck
```

Run Tier B locally only when you have headroom (Linux/WSL or a machine that does not OOM). **A local full typecheck OOM must not block Tier A work** — rely on CI for the full gate.

Do not hide failures. Do not fix unrelated failures without explicit approval.

## Windows Agent Conventions

- **PowerShell chaining:** use `;` to sequence commands, not `&&` (e.g. `npm run build; npm run guard:architecture`).
- **Scoped typecheck:** `npm run typecheck:changed -- app/(public)/_components` — pass any repo-relative directory or `.ts`/`.tsx` file after `--`.
- **Git-changed default:** `npm run typecheck:changed` with no args diffs against `main` (or `origin/main`).
- **Full typecheck:** prefer CI; local `npm run typecheck` may exhaust Node heap on large diffs.
