-- Additive: pin metadata for hybrid-twin V0.1 (category, scope, mesh anchor).
-- Existing pin columns stay untouched. Do not apply until reviewed.

alter table public.digital_twin_pins
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on column public.digital_twin_pins.metadata is
  'Hybrid viewer extras: category, visibility_scope (project|epoch), source mesh/face, attachments summary.';
