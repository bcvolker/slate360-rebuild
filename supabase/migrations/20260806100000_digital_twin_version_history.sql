-- D1 (TWIN_SERVICE_STUDIO_PLAN.md, Phase D + §4): version-history metadata,
-- pin/measurement lineage, and pinned attachments. Purely additive — no
-- existing column, table, or constraint is dropped except the two FKs this
-- migration deliberately loosens from CASCADE to SET NULL (see below).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. digital_twin_models — version identity
-- ─────────────────────────────────────────────────────────────────────────────
-- version_label / notes: operator-settable, shown in TwinVersionsPanel and the
-- future client-portal timeline (Phase G). captured_at: when the underlying
-- capture happened, distinct from created_at (when this MODEL ROW was
-- processed) — backfilled from the linked capture so the existing
-- progression-timeline logic (load-progression-models.ts, which today infers
-- dates from digital_twin_captures) gains a first-class column to read
-- instead. parent_model_id: which model this one was reprocessed FROM, if
-- any — lets a future UI show "reprocessed from v2" without guessing from
-- timestamps.
alter table public.digital_twin_models
  add column if not exists version_label text,
  add column if not exists notes text,
  add column if not exists captured_at timestamptz,
  add column if not exists parent_model_id uuid
    references public.digital_twin_models(id) on delete set null;

update public.digital_twin_models m
set captured_at = coalesce(c.uploaded_at, c.created_at, m.created_at)
from public.digital_twin_captures c
where m.capture_id = c.id and m.captured_at is null;

update public.digital_twin_models
set captured_at = created_at
where captured_at is null;

alter table public.digital_twin_models
  alter column captured_at set not null,
  alter column captured_at set default now();

create index if not exists idx_dt_models_captured_at
  on public.digital_twin_models(space_id, captured_at);
create index if not exists idx_dt_models_parent
  on public.digital_twin_models(parent_model_id)
  where parent_model_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. digital_twin_pins / digital_twin_measurements — survive a version delete
-- ─────────────────────────────────────────────────────────────────────────────
-- A pin or measurement is a space-scoped annotation that happens to have been
-- created while a particular model was current (model_id is provenance, not
-- ownership — every read path already queries by space_id, never model_id).
-- ON DELETE CASCADE on model_id was therefore a landmine: deleting a
-- superseded version silently deleted every pin/measurement a user placed
-- against it. Loosen to SET NULL — Postgres has no ALTER ... ON DELETE, so
-- drop and recreate each constraint.
alter table public.digital_twin_pins
  drop constraint if exists digital_twin_pins_model_id_fkey;
alter table public.digital_twin_pins
  add constraint digital_twin_pins_model_id_fkey
  foreign key (model_id) references public.digital_twin_models(id) on delete set null;

alter table public.digital_twin_measurements
  drop constraint if exists digital_twin_measurements_model_id_fkey;
alter table public.digital_twin_measurements
  add constraint digital_twin_measurements_model_id_fkey
  foreign key (model_id) references public.digital_twin_models(id) on delete set null;

-- Lineage columns. No current write path creates a *new* pin row for an
-- existing physical issue after a reprocess — pins already persist because
-- they were never duplicated per version — but a future UI (Phase G) needs a
-- way to explicitly say "this new pin continues that old one" once it lets a
-- user re-pin against a fresh model. pin_series_id defaults every pin
-- (existing and new) to its own single-member series today; linking two
-- series together is a future UPDATE, not something this migration performs.
alter table public.digital_twin_pins
  add column if not exists pin_series_id uuid not null default gen_random_uuid();
create index if not exists idx_dt_pins_series on public.digital_twin_pins(pin_series_id);

-- Unlike pins, a measurement's two raycast points can never be exactly
-- reproduced on a later version, so "the same real-world dimension measured
-- again" cannot be inferred — it is nullable and set explicitly (client- or
-- portal-side) when a user says two measurements correspond.
alter table public.digital_twin_measurements
  add column if not exists corresponds_to_measurement_id uuid
    references public.digital_twin_measurements(id) on delete set null;
create index if not exists idx_dt_measurements_corresponds
  on public.digital_twin_measurements(corresponds_to_measurement_id)
  where corresponds_to_measurement_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. digital_twin_pin_attachments — files/links pinned to a model location
-- ─────────────────────────────────────────────────────────────────────────────
-- A pin's location plus an attached document/photo/thermal/proposal/invoice —
-- the "pin a proposal to the area that needs work" capability. Attachments
-- follow the pin (and therefore the space), not any one model version, for
-- the same reason pins do. At least one payload field must be set: an
-- uploaded file (storage_key, mirrored into SlateDrop like every other twin
-- asset), a reference to an existing SlateDrop file (unified_file_id), or a
-- plain link (external_url).
create table if not exists public.digital_twin_pin_attachments (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  pin_id          uuid not null references public.digital_twin_pins(id) on delete cascade,
  kind            text not null
                    check (kind in
                      ('document', 'image', 'panorama_360', 'thermal', 'link', 'proposal', 'invoice')),
  storage_key     text,
  unified_file_id uuid references public.unified_files(id) on delete set null,
  external_url    text,
  title           text,
  content_type    text,
  file_size_bytes bigint,
  created_by      uuid references auth.users(id) on delete set null,
  share_token_id  uuid references public.digital_twin_share_tokens(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint digital_twin_pin_attachments_payload_chk
    check (storage_key is not null or unified_file_id is not null or external_url is not null)
);
create index if not exists idx_dt_pin_attachments_pin
  on public.digital_twin_pin_attachments(pin_id, created_at);

alter table public.digital_twin_pin_attachments enable row level security;
revoke all on table public.digital_twin_pin_attachments from anon;

drop policy if exists dt_pin_attachments_all on public.digital_twin_pin_attachments;
create policy dt_pin_attachments_all on public.digital_twin_pin_attachments
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_pins p
      join public.digital_twin_spaces s on s.id = p.space_id
      where p.id = pin_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_pins p
      join public.digital_twin_spaces s on s.id = p.space_id
      where p.id = pin_id and public.user_can_access_project(s.project_id)
    )
  );
