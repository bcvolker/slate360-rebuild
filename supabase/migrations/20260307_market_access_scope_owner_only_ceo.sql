-- Keep CEO Command Center exclusive to the owner account while allowing
-- per-user grants for Market Robot and Athlete360.

alter table public.slate360_staff
  alter column access_scope set default '{market}';

update public.slate360_staff
set access_scope = array_remove(coalesce(access_scope, '{market}'::text[]), 'ceo')
where access_scope is not null
  and access_scope @> array['ceo'];