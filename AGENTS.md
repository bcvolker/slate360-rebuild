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
- Use the Dark Glass & Amber design system.
- Use canonical app shell components for authenticated surfaces.
- Do not mix UI redesigns with backend or persistence fixes.

## Git Rules

- No direct pushes to `main`.
- Work on feature branches.
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

Before marking implementation work complete, run:

1. `npm run typecheck`
2. `npm run build`
3. Relevant guardrails for the touched area

Do not hide failures. Do not fix unrelated failures without explicit approval.
