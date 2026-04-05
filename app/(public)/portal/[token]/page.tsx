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

  // ── 1. Validate the token ────────────────────────────────────
  const { data: access, error } = await admin
    .from("deliverable_access_tokens")
    .select("id, org_id, deliverable_type, deliverable_id, role, expires_at, max_views, view_count, is_revoked")
    .eq("token", token)
    .single();

  if (error || !access) notFound();

  const dat = access as DeliverableToken;

  // ── 2. Check revocation ──────────────────────────────────────
  if (dat.is_revoked) {
    return <ExpiredView reason="This link has been revoked." />;
  }

  // ── 3. Check expiry ──────────────────────────────────────────
  if (dat.expires_at && new Date(dat.expires_at) < new Date()) {
    return <ExpiredView reason="This link has expired." />;
  }

  // ── 4. Check view cap ────────────────────────────────────────
  if (dat.max_views !== null && dat.view_count >= dat.max_views) {
    return <ExpiredView reason="This link has reached its maximum number of views." />;
  }

  // ── 5. Increment view count + update last_viewed_at ──────────
  await admin
    .from("deliverable_access_tokens")
    .update({ view_count: dat.view_count + 1, last_viewed_at: new Date().toISOString() })
    .eq("id", dat.id);

  // ── 6. Fetch org branding for Walled Garden chrome ───────────
  let branding: OrgBranding;
  try {
    branding = await getOrgBranding(dat.org_id);
  } catch {
    branding = DEFAULT_BRANDING;
  }

  // ── 7. Render skeleton (UI placeholder) ──────────────────────
  return (
    <div
      className="min-h-screen bg-background"
      style={{
        "--brand-primary": branding.primary_color,
        "--brand-accent": branding.accent_color,
        "--brand-font": branding.font_family,
      } as React.CSSProperties}
    >
      {/* Branded header */}
      <header className="flex h-14 items-center gap-3 border-b px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={branding.logo_url} alt={branding.brand_name} className="h-7" />
        <span className="text-sm font-medium text-muted-foreground">
          {branding.brand_name}
        </span>
      </header>

      {/* Content area — will be replaced with type-specific viewer */}
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-sm text-muted-foreground">
          Deliverable: <strong>{dat.deliverable_type}</strong> &middot; Role: {dat.role}
        </p>
        {/* TODO: Route to type-specific viewer (TourViewer, ReportViewer, etc.) */}
      </main>
    </div>
  );
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
