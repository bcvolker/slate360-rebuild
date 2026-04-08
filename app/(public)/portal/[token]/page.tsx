/**
 * (public)/portal/[token] — Branded public deliverable viewer.
 *
 * Serves deliverables (tours, reports, walks) via `deliverable_access_tokens`.
 * Separated from the legacy SlateDrop file-share route at /share/[token].
 * Applies the org's Walled Garden branding (logo, colors, font).
 *
 * This is the server-side fetching skeleton — UI will be added later.
 */
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgBranding } from "@/lib/server/branding";
import type { OrgBranding } from "@/lib/types/branding";
import { DEFAULT_BRANDING } from "@/lib/types/branding";
import type { OrgFeatureFlags } from "@/lib/entitlements";

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
  if (!token || token.length < 10) notFound();

  const admin = createAdminClient();

  // ── 1. Atomically claim a view (TOCTOU-safe) ────────────────
  // Single UPDATE checks all validity conditions and increments view_count
  // in one atomic operation. Returns the updated row on success, empty on denial.
  const { data: claimed } = await admin.rpc("claim_deliverable_view", {
    p_token: token,
  });

  const access = Array.isArray(claimed) ? claimed[0] : claimed;

  if (access) {
    // View successfully claimed — continue to render
    const dat = access as DeliverableToken;

    // ── 2. Check org feature flags for graceful degradation ────
    // If the org has lost the flag required for this deliverable type
    // (e.g. standalone_tour_builder cancelled), we still serve the content
    // but mark it as downgraded so the viewer can apply a watermark.
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

    // ── 3. Fetch org branding for Walled Garden chrome ─────────
    let branding: OrgBranding;
    try {
      branding = await getOrgBranding(dat.org_id);
    } catch {
      branding = DEFAULT_BRANDING;
    }

    return (
      <div
        className="min-h-screen bg-background"
        style={{
          "--brand-primary": branding.primary_color,
          "--brand-accent": branding.accent_color,
          "--brand-font": branding.font_family,
        } as React.CSSProperties}
      >
        <header className="flex h-14 items-center gap-3 border-b px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={branding.logo_url} alt={branding.brand_name} className="h-7" />
          <span className="text-sm font-medium text-muted-foreground">
            {branding.brand_name}
          </span>
        </header>

        {isDowngraded && (
          <div className="flex items-center justify-between bg-yellow-50 px-6 py-3 text-sm text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            <span>
              This content was created with a paid plan that is no longer active.
            </span>
            <a
              href="https://slate360.ai/pricing"
              className="ml-4 font-semibold underline"
            >
              Upgrade to Remove Watermark
            </a>
          </div>
        )}

        <main className="relative mx-auto max-w-4xl p-8">
          {isDowngraded && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10 select-none"
            >
              <span className="rotate-[-35deg] text-6xl font-black uppercase tracking-widest text-gray-800 dark:text-gray-200">
                Watermark
              </span>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Deliverable: <strong>{dat.deliverable_type}</strong> &middot; Role: {dat.role}
          </p>
          {/* TODO: Route to type-specific viewer (TourViewer, ReportViewer, etc.)
              Pass isDowngraded={isDowngraded} to the viewer component when built. */}
        </main>
      </div>
    );
  }

  // ── Claim denied — determine reason for user-friendly message ──
  const { data: tokenRow } = await admin
    .from("deliverable_access_tokens")
    .select("is_revoked, expires_at, max_views, view_count")
    .eq("token", token)
    .single();

  if (!tokenRow) notFound();

  const row = tokenRow as {
    is_revoked: boolean;
    expires_at: string | null;
    max_views: number | null;
    view_count: number;
  };

  if (row.is_revoked) {
    return <ExpiredView reason="This link has been revoked." />;
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return <ExpiredView reason="This link has expired." />;
  }
  if (row.max_views !== null && row.view_count >= row.max_views) {
    return <ExpiredView reason="This link has reached its maximum number of views." />;
  }

  // Shouldn't reach here, but safety fallback
  notFound();
}

/** Shared dead-link view for expired / revoked / capped tokens. */
function ExpiredView({ reason }: { reason: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-3 p-8 text-center">
        <h1 className="text-2xl font-bold">Link Unavailable</h1>
        <p className="text-sm text-muted-foreground">{reason}</p>
      </div>
    </div>
  );
}
