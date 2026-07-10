-- Thermal Studio P0 fix (2026-07-10): the capture PATCH route
-- (app/api/ops/thermal/captures/[captureId]/route.ts) reads and writes
-- thermal_captures.metadata (spots / tuning / findings / curation / palette),
-- but the column was never created — every per-image save failed silently.
-- Additive, idempotent. Applied to prod 2026-07-10 via supabase db query.
alter table public.thermal_captures
  add column if not exists metadata jsonb not null default '{}'::jsonb;
