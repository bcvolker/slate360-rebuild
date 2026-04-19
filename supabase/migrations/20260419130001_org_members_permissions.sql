-- Enterprise-only per-feature permission overrides on organization_members.
-- Resolved at runtime in lib/server/org-context.ts when org tier='enterprise'.
-- Outside of enterprise, role + isAdmin remain authoritative.
--
-- Recognized keys (all boolean):
--   canViewBilling
--   canViewOrgDataUsage
--   canViewAuditLog
--   canInviteMembers
--   canChangeOrgSettings
--   canPublishToClients

alter table public.organization_members
  add column if not exists permissions jsonb not null default '{}'::jsonb;

comment on column public.organization_members.permissions is
  'Enterprise per-feature overrides keyed by permission name (boolean). Ignored outside the enterprise tier.';
