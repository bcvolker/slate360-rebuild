/**
 * (public)/portal/[token] — Branded public deliverable viewer.
 *
 * Serves deliverables (tours, reports, walks) via `deliverable_access_tokens`.
 * Separated from the legacy SlateDrop file-share route at /share/[token].
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgBranding } from "@/lib/server/branding";
import type { OrgBranding } from "@/lib/types/branding";
import { DEFAULT_BRANDING } from "@/lib/types/branding";
import type { OrgFeatureFlags } from "@/lib/entitlements";
import {
  ExternalPortalShell,
  PortalGlassCard,
  TokenStatePage,
} from "@/components/external-portal";

export const dynamic = "force-dynamic";

interface DeliverableToken {
  id: string;
  org_id: string;
  deliverable_type: string;
  deliverable_id: string;
  role: string;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  is_revoked: boolean;
}

type PageProps = { params: Promise<{ token: string }> };

export default async function DeliverableSharePage({ params }: PageProps) {
  const { token } = await params;
  if (!token || token.length < 10) {
    return <TokenStatePage state="invalid" badge="Client portal" />;
  }

  const admin = createAdminClient();

  const { data: claimed } = await admin.rpc("claim_deliverable_view", {
    p_token: token,
  });

  const access = Array.isArray(claimed) ? claimed[0] : claimed;

  if (access) {
    const dat = access as DeliverableToken;

    let isDowngraded = false;
    const { data: flags } = await admin
      .from("org_feature_flags")
      .select("standalone_tour_builder, standalone_punchwalk")
      .eq("org_id", dat.org_id)
      .maybeSingle();

    const orgFlags = (flags ?? {}) as Partial<OrgFeatureFlags>;

    if (dat.deliverable_type === "tour" && orgFlags.standalone_tour_builder === false) {
      isDowngraded = true;
    }
    if (dat.deliverable_type === "punchwalk" && orgFlags.standalone_punchwalk === false) {
      isDowngraded = true;
    }

    let branding: OrgBranding;
    try {
      branding = await getOrgBranding(dat.org_id);
    } catch {
      branding = DEFAULT_BRANDING;
    }

    return (
      <div
        style={
          {
            "--brand-primary": branding.primary_color,
            "--brand-accent": branding.accent_color,
            "--brand-font": branding.font_family,
          } as React.CSSProperties
        }
      >
        <ExternalPortalShell
          portalLabel="Client portal"
          title={branding.brand_name}
          subtitle={`${formatDeliverableType(dat.deliverable_type)} · ${formatRole(dat.role)} access`}
          orgName={branding.brand_name}
          orgLogoUrl={branding.logo_url}
        >
          {isDowngraded ? (
            <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-100 sm:px-6">
              <span>
                This content was created with a plan that is no longer active on this account.
              </span>
              <a
                href="https://www.slate360.ai/pricing"
                className="ml-2 font-semibold text-amber-300 underline underline-offset-4"
              >
                View plans
              </a>
            </div>
          ) : null}

          <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6">
            {isDowngraded ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07] select-none"
              >
                <span className="rotate-[-35deg] text-6xl font-black uppercase tracking-widest text-white">
                  {branding.brand_name}
                </span>
              </div>
            ) : null}

            <PortalGlassCard className="relative text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logo_url}
                alt={branding.brand_name}
                className="mx-auto mb-4 h-10 object-contain"
              />
              <h2 className="text-lg font-bold text-white">
                {formatDeliverableType(dat.deliverable_type)} deliverable
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Your secure link is active. This {formatDeliverableType(dat.deliverable_type).toLowerCase()}{" "}
                deliverable is shared on behalf of {branding.brand_name}. Contact them if you need
                the files in another format.
              </p>
              <p className="mt-4 text-xs text-slate-500">
                Access level: <span className="font-medium text-slate-300">{formatRole(dat.role)}</span>
              </p>
            </PortalGlassCard>
          </main>
        </ExternalPortalShell>
      </div>
    );
  }

  const { data: tokenRow } = await admin
    .from("deliverable_access_tokens")
    .select("is_revoked, expires_at, max_views, view_count")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) {
    return <TokenStatePage state="invalid" badge="Client portal" />;
  }

  const row = tokenRow as {
    is_revoked: boolean;
    expires_at: string | null;
    max_views: number | null;
    view_count: number;
  };

  if (row.is_revoked) {
    return (
      <TokenStatePage
        state="revoked"
        badge="Client portal"
        description="This link has been revoked."
      />
    );
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return (
      <TokenStatePage
        state="expired"
        badge="Client portal"
        description="This link has expired."
      />
    );
  }
  if (row.max_views !== null && row.view_count >= row.max_views) {
    return (
      <TokenStatePage
        state="max_views"
        badge="Client portal"
        description="This link has reached its maximum number of views."
      />
    );
  }

  return (
    <TokenStatePage
      state="unavailable"
      badge="Client portal"
      description="This link could not be opened. Request a new link from the sender."
    />
  );
}

function formatDeliverableType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}
