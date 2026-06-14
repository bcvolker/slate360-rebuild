-- S0-B (walks-with-plans pin authoritative ID lifecycle).
-- Bug B: client_pin_id could be null on legacy rows, letting the viewer's join key
-- fall back to the server id (ambiguous → duplicate-pin bug). Backfill a stable,
-- non-null client_pin_id for any legacy rows so client_pin_id is always present.
-- The idempotency unique index already exists:
--   uniq_sw_pins_client_pin_id (org_id, created_by, client_pin_id) where client_pin_id is not null
-- (migration 20260427092000). Using id::text keeps each backfilled value unique.

update public.site_walk_pins
set client_pin_id = id::text
where client_pin_id is null;
