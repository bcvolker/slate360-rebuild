# Thermal Studio V2 — Adversarial Audit Remediation Plan (LOCKED 2026-07-11)

Two independent AI platforms ran adversarial audits of Thermal Studio V2 against the deployed `/preview/thermal-v2` build and the source, immediately after the 16-slice build (`THERMAL_V2_BUILD_LOG.md`) closed. Both converged independently on the same root causes (described in different words), both concluded **"not production-ready,"** and both explicitly said not to execute the S9 live-swap yet — consistent with S9 already being held pending Brian's review.

Separately, Brian flagged that the visual result doesn't feel like the "fresh and beautiful" redesign the V2 rebuild was supposed to deliver: too dark, boxes-within-boxes, text spilling out of cards.

This doc is the locked remediation plan against both. **Before planning any fix, every load-bearing claim from the two audits was independently re-verified against the actual current code** (not taken at face value) — see §1. The fix plan in §2–§6 is built only on confirmed findings.

## §0. Audit verdicts (for the record)

- **Audit A**: 8 Critical / 12 High / 7 Medium / 1 Low. "The happy-path component tests are green, but the integration contract is broken at the points that determine evidentiary trust: autosave truth, AI review flowing into reports, job failure recovery, and output discoverability."
- **Audit B**: 5 Critical / 6 High / 5 Medium / 2 Low. "Rapid 16-slice build produced a dense, largely wired cockpit — but the integration seams that matter for a thermographer... are broken."
- Both explicitly noted the existing 84/84 e2e suite passing does NOT cover these failures — the suite validates mocked, single-tab component contracts, not cross-tab persistence, review-to-deliverable correctness, or real job-failure recovery.

## §1. Verification pass — 15 load-bearing claims checked against real code

A read-only verification agent re-derived each claim directly from source (file:line evidence, not audit prose). **All 15 came back CONFIRMED TRUE** (one partially — see item 13). This is unusually high agreement for independent audits and materially raises confidence in the rest of each report.

| # | Claim | Verdict |
|---|-------|---------|
| 1 | Shell (`ThermalV2Shell.tsx`) never mutates/refetches `captures`; each tab fully unmounts on switch | CONFIRMED |
| 2 | Report preview (`ThermalReportPreview.tsx`) reads raw `capture.anomalies`, never `metadata.findings_review` | CONFIRMED |
| 3 | Worker PDF/HTML (`report.py`) has zero references to `findings_review`/`dismissed`/`edits` | CONFIRMED |
| 4 | Library's "This image" scope resolves to `[]` on fresh load (`focusedId` starts `null`, no fallback); Analyze already has a `captures[0]?.id` fallback Library lacks | CONFIRMED |
| 5 | Upload (`LibraryGrid.tsx`) discards per-file success/failure and always fires `onUploaded()`; `onUploaded` is only a toast string, not a refetch | CONFIRMED |
| 6 | Motion range (`useMotionState`, owned by `DeliverPanel`) resets on any shell tab switch away from Deliver, even though the in-component "← Deliver" breadcrumb correctly preserves it | CONFIRMED |
| 7 | AI Review's "Run AI" has no busy/in-flight guard, unlike Library's established `busy` pattern | CONFIRMED |
| 8 | Fusion blend/scale sliders have no numeric type-in twin, unlike every other slider in the app | CONFIRMED |
| 9 | Escape cascade never closes the ⋯ menu or the Analyst chat drawer | CONFIRMED |
| 10 | Export always renders the tuned grid's full natural range; no mechanism for a customized display span to reach it | CONFIRMED |
| 11 | AI Review has its own bespoke one-shot °C/°F read instead of the shared `useUnitPreference()` hook | CONFIRMED |
| 12 | Chat's grounding-context builder hardcodes °C labels unconditionally | CONFIRMED |
| 13 | Emissivity number-input has no validation (slider is bounded, text field isn't) | **PARTIALLY TRUE** — slider bounded, number input has neither HTML bounds nor JS clamping |
| 14 | Chat's optimistic user bubble isn't marked failed on send error | CONFIRMED |
| 15 | Compare view's hover math ignores `object-fit:contain` letterboxing, unlike the single-image viewer's `useCanvasStage.ts` | CONFIRMED |

## §2. Batch 1 — Shell owns mutable capture state (the root-cause fix)

Fixes: upload requiring a manual browser refresh; panorama results invisible until reload; Motion range resetting on tab switch; edited metadata appearing stale after a tab round-trip. This single defect explains ~7 "Critical" findings across both audits.

Design (validated against current code by a dedicated planning pass; reuses existing infrastructure, no speculative new architecture):

1. **`components/thermal-studio-v2/lib/map-captures.ts`** (new) — extract the snake_case→camelCase capture mapping currently inlined in `app/(dashboard)/thermal-studio-v2/[sessionId]/page.tsx` into `toThermalV2Captures()`, so SSR and a client refetch always agree on shape.
2. **`hooks/useThermalCapturesRealtime.ts`** (new) — mirrors the existing, already-proven `useThermalJobRealtime.ts` pattern (`supabase.channel(...).on(POSTGRES_CHANGES, {event:"INSERT", filter: session_id=eq...})`), fires on any new `thermal_captures` row for this session. This is what makes an async panorama-stitch result appear without polling.
3. **New additive migration** — add `thermal_captures` to the `supabase_realtime` publication (one-line pattern identical to the existing `thermal_processing_jobs` migration; RLS is already structurally equivalent). Claude prepares the SQL; Brian applies it per the standing Supabase workflow.
4. **`components/thermal-studio-v2/lib/save-status.ts`** — add a small pub-sub (`onCaptureMetadataSaved`) fired from `patchCaptureWithStatus`'s existing success branch, now parsing the PATCH response's `{ metadata }` body instead of discarding it. All 8 existing autosave call sites (spots, tuning, palette, rotation, fusion, findings, findings_review, batch-settings) already funnel through this one function — zero changes needed in any of them.
5. **`ThermalV2Shell.tsx`** — lift `captures` into `useState` (seeded from the prop); add `refetchCaptures()` hitting the existing `GET /api/ops/thermal/sessions/[sessionId]` route (no new backend route needed); subscribe to the new Realtime hook; subscribe to `onCaptureMetadataSaved` to merge an edited capture's metadata in place instantly (no network round-trip, avoids a race between a full refetch and an in-flight edit). Call `refetchCaptures()` deterministically right after the upload loop finishes.
6. **Motion lift** — `useMotionState` moves from `DeliverPanel` up to `ThermalV2Shell` (it only ever depended on `captures.length`, nothing else) and is passed down as a prop. `DeliverPanel` keeps its own `motionMode`/section-navigation state locally — resetting that view state on remount is fine; only the in/out range + settings values needed to survive.
7. **`LibraryPanel.tsx`** — `onUploaded`/`onImported` call `refetchCaptures()`; toast copy drops "— refresh to see new images" (no longer true).

No changes needed in `AnalyzePanel.tsx`/`AiReviewPanel.tsx`/`ReportPanel.tsx` — they already read `captures.find(...)` off the prop each render, so a corrected array flows through for free.

Non-regression already checked: `useLibrarySelection`'s `reportOrder`/`selectedIds` seed via a lazy `useState` initializer that only runs on mount — refetches won't reset selection or report order.

## §3. Batch 2 — Review decisions must reach every deliverable (evidentiary trust)

Fixes: dismissed findings still printing in reports; accepted edits not appearing; PDF/HTML disagreeing with the operator's signed-off review.

1. **New shared projection** (e.g. `lib/thermal/reviewed-findings.ts`) — takes `capture.anomalies` + `capture.metadata.findings_review` and returns what should actually render: drop dismissed, prefer `edits[i]` text over the raw AI observation for accepted/edited findings.
2. **`components/ops/thermal/ThermalReportPreview.tsx`** — replace the direct `capture.anomalies.map(...)` loop with the shared projection.
3. **`workers/modal/thermal-analysis/report.py`** — port the identical filter/edit logic in Python (the worker can't share JS code, so keep the two rules in lockstep deliberately, not by inventing a second rule).
4. **Report curation gap** — add a "remove image" control to the report outline (currently ★-add-only); don't silently fall back to "all captures" when `reportOrder` is genuinely empty.
5. **`report_set` restore** — verify whether `session.metadata.report_set` is passed into `seedReportOrder` on the V2 route; wire it if not (the two audits disagreed slightly on how broken this is — confirm during implementation).

## §4. Batch 3 — Independent, verified, smaller fixes

Each stands alone — no ordering dependency on Batch 1/2 or on each other. One execution pass:

- **Default Scope resolves to nothing on fresh load** — give Library the same `captures[0]?.id` fallback Analyze already has (or seed `focusedId` on mount).
- **Upload success/failure not tracked per-file** — track each file's actual result; only report success (and refetch) when at least one finalized; surface specific failures.
- **AI Review missing a busy-guard on "Run AI"** — port `LibraryNextSteps.tsx`'s established `busy` pattern.
- **Escape cascade doesn't close the ⋯ menu or the Analyst chat drawer** — add both as levels in the existing ordered cascade in `AnalyzePanel.tsx`.
- **Fusion blend/scale sliders have no numeric type-in twin** — add them, matching every other slider in the app.
- **Emissivity number input has no validation** — clamp on change/blur to the slider's existing 0.05–1.0 bounds.
- **°C/°F preference isn't actually one preference** — switch `AiReviewPanel.tsx` to the shared `useUnitPreference()` hook; make chat's grounding-context unit-aware; align Report's `branding.temp_unit` path.
- **Export ignores the operator's customized display span** — persist the customized span per-image (consistent with how rotation/palette already persist), so exports are "what you see is what you get."
- **Chat's optimistic user bubble doesn't mark itself failed on send error** — attach a `failed` flag to that message on error instead of only a separate generic error string.
- **Compare view's hover math ignores letterboxing** — port `useCanvasStage.ts`'s `fitScale`/offset math into `AnalyzeCompareView.tsx`'s hover handler.
- **Destructive "Revoke" share link has no confirmation** — add a confirm step naming the link, consistent with dismiss-finding's existing Restore safety net.
- **Icon-only controls missing accessible names** — sweep for `aria-label`/`aria-pressed` gaps on toolbar/tool buttons relying on `title` alone.

## §5. Batch 4 — Visual: text overflow & "boxes within boxes" density

The objective, fixable half of the visual complaint. A repo-wide grep found **111 separate `border` usages across 47 files** in `components/thermal-studio-v2/**` — nearly every sub-component wraps itself in its own bordered rectangle, and because rails nest (rail → accordion → control-group → individual control), the result is visually noisy nested boxes rather than one clean surface with internal structure.

- Reduce nesting: where an accordion/rail already has a border, inner sub-groups (alarm controls, severity bands, fusion controls, GPS mini-map wrapper, motion ruler status strip, etc.) switch from a full `border` box to a `border-t`/`border-b` divider or plain spacing — one level of "boxed" per region, not three or four nested.
- Fix the literal "text spilling out of cards" mechanism: sweep flex/grid children in the newest, densest components (chat bubbles + proposal cards, Motion's ruler status line, GPS coordinate text, fusion blend %/scale % labels) for missing `min-w-0`/`truncate`/`break-words` — the classic Tailwind flex-overflow bug.
- Re-run the density/no-scroll audit at sub-1280px width (where the first audit's own probe ran) to confirm nothing still clips.

## §6. Batch 5 — Visual: overall tone ("too dark," not "fresh") — flagged for sign-off, not unilaterally changed

The Graphite Glass system (near-black `#0B0F15` canvas, `bg-white/[0.04]` glass panels, one accent per surface) is an explicitly **locked** design system per this project's own governing doc, previously validated through Brian's multi-AI design panel. This plan does not unilaterally change locked tokens on a unilateral taste call.

Process: after Batch 4's density cleanup (fewer, cleaner nested boxes), take fresh before/after screenshots of the same dense screens (Analyze with Display+Fusion open, the chat drawer, the Motion editor, Library Map view) and present them to Brian. If density alone doesn't reach "fresh and beautiful," the next step is a small, explicit token proposal (e.g. slightly lighter panel-surface opacity, more contrast between nesting levels) presented as a before/after comparison for sign-off — not a blind global recolor.

## Execution order

1. **Batch 1** (shell state) — biggest blast radius, unblocks the most other testing.
2. **Batch 2** (review→report) — architecturally independent; the other Critical.
3. **Batch 3** — independent small fixes, one sweep.
4. **Batch 4** — visual density/overflow cleanup.
5. **Batch 5** — screenshot review with Brian; only touches locked tokens with explicit sign-off.

## Verification plan (per batch)

- Scoped typecheck via `tsconfig.thermal-v2.json` (established pattern all build).
- `guard:architecture` / `guard:design` / `guard:file-size-regression`.
- New/extended e2e specs per batch (`e2e/thermal-v2-*.spec.ts`) — Batch 1 needs a real reload-survives-edit test and an upload-without-refresh test; Batch 2 needs a report-respects-findings_review test; Batch 3's fixes each get a small targeted spec.
- Manual pass in the live preview via preview tools for every fix, same discipline as the original 16-slice build.
- Full regression re-run at the end of all batches.
- This entire remediation stays within the already-approved "keep building on `/preview/thermal-v2`, S9 stays held" pattern — none of it is the live swap.
