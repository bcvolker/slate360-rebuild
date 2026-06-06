-- Supabase Realtime publication for Digital Twin progress + collaboration.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'digital_twin_captures'
  ) then
    alter publication supabase_realtime add table public.digital_twin_captures;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'digital_twin_capture_assets'
  ) then
    alter publication supabase_realtime add table public.digital_twin_capture_assets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'digital_twin_processing_jobs'
  ) then
    alter publication supabase_realtime add table public.digital_twin_processing_jobs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'digital_twin_pins'
  ) then
    alter publication supabase_realtime add table public.digital_twin_pins;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'digital_twin_pin_comments'
  ) then
    alter publication supabase_realtime add table public.digital_twin_pin_comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'digital_twin_comments'
  ) then
    alter publication supabase_realtime add table public.digital_twin_comments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'digital_twin_viewer_states'
  ) then
    alter publication supabase_realtime add table public.digital_twin_viewer_states;
  end if;
end $$;
