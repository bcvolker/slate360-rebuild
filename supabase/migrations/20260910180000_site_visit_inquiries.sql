-- Public homepage "Request a site visit" enquiry form.
-- Additive only. Insert-only from the public API route (service role); no
-- public SELECT policy — Brian reviews inquiries via email, not a public UI.
create table if not exists public.site_visit_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  company text,
  phone text,
  email text not null,
  project_location text,
  location_lat double precision,
  location_lng double precision,
  location_boundary jsonb,
  timeline text,
  what_is_happening text,
  notes text,
  attachment_key text,
  attachment_name text,
  emailed boolean not null default false
);

alter table public.site_visit_inquiries enable row level security;

-- No public policies: only the service-role key (used server-side by the
-- API route) can read or write this table.
