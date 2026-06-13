# Plan Pin — Authoritative ID Lifecycle (S0-B decision doc)

Walks-with-plans foundation. AGENTS.md: "plan pins must use one authoritative ID lifecycle."
This is the contract every pin/capture path must follow. Audited June 13, 2026 against the
existing V1 plan stack (`components/site-walk/capture/*`) + V2 capture loop.

## The contract

1. **`client_pin_id` is the authoritative ID.** A UUID is minted at the **long-press drop**,
   client-side, **before any network call**. It is the permanent join key for pin ↔ capture
   and survives offline → sync. It is never reassigned.
2. **Server `id` is secondary.** The DB row's UUID is reconciled **asynchronously** after the
   pin POST succeeds (see `useWithPlansPinCapture` effect that copies `captureCtx.planTarget.pinId`
   in once it arrives). Client code keys pins by `client_pin_id`, never by server `id`.
3. **The capture carries the pin target.** When a photo is captured against a pin, the capture
   payload includes `planTarget { planSheetId, xPct, yPct, clientPinId, pinId? }`. This is
   already wired: `useCaptureUpload` → `queueOfflineCapture({ ..., planTarget })` →
   `attachItemToPlanPin(sessionId, item.id, planTarget)` on flush. The link survives offline.
4. **Pin number ≠ pin ID.** `pin_number` (the visible label) is display-only and may renumber;
   never use it as a key.

## What is already correct (do not rebuild)
- Capture+planTarget flows through the offline queue (`offline-capture.ts` `PlanTarget` type
  carries `clientPinId`); `attachItemToPlanPin` reconciles pin.item_id ← capture on flush.
- Async server-id reconcile effect in `useWithPlansPinCapture`.
- `PlanViewerLeaflet` keys optimistic pins by `client_pin_id`.

## The two real gaps to fix (S0-B implementation)

**Gap A — pin POST has no offline queue.** `lib/capture-v2/plan-pin-drop.ts` `dropPlanPin`
does an immediate `fetch("/api/site-walk/pins")` and throws on failure. A pin dropped **offline**
(or dropped but not yet captured) can fail to persist. Fix: optimistically render the pin keyed
by `client_pin_id` and **queue the pin POST** the same way `queueOfflineCapture` queues captures,
so a pin survives offline even with no attached photo, and dedupes by `client_pin_id` on flush
(server upsert on `client_pin_id`, never insert-by-default).

**Gap B — `client_pin_id` can be ambiguous.** `PlanViewerLeaflet` uses
`clientPinId: pin.client_pin_id ?? pin.id`. If `client_pin_id` is ever null, the join key
falls back to a server id and reconciliation can mismatch (→ duplicate pins, the round-one bug).
Fix: mint `client_pin_id` explicitly at drop and assert it is always present; remove the
`?? pin.id` fallback at the source.

## Proof test (must pass on a real device before any viewer UI / S3 migration)
1. Drop pin on a plan (long-press) → capture a photo → go **fully offline** → flush queue →
   reconnect/sync → reopen the walk in review.
2. Assert: exactly **one** pin on the sheet; pin keeps the **same `client_pin_id`**; the photo
   is attached (`item_id` set); **no duplicate** pins on this set or any other walk's view.
3. Pin-only case: drop a pin offline, **do not** capture, flush, sync → the pin still exists
   (Gap A) with its original `client_pin_id`.
4. Cross-walk isolation: a second walk on the same plan set does not see walk 1's pins unless
   viewing "annotated" (per `session_id` layer filter in `usePlanViewer`).

## Server requirement
`/api/site-walk/pins` must **upsert on `client_pin_id`** (unique per session), never blind-insert.
This is what makes a re-sent offline POST idempotent. Verify the route + a unique constraint on
`(session_id, client_pin_id)` before shipping.

## Notes
- This flow currently spans V1 (`CaptureContext`, `PlanViewerLeaflet`, `PlanPin`) + V2 loop.
  S3 migrates capture into the V2 `NoPlansCaptureCanvas` + shipped pin modal + note-review
  screen; the contract above must hold through that migration. See
  `slate360-walks-with-plans-plan` and `slate360-pwa-performance` (capture-reuse hazard).
