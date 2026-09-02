/**
 * Single /portal/[token] route. Resolves walk share tokens and legacy
 * deliverable tokens without telling the client which table was tried.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgBranding } from "@/lib/server/branding";
import { DEFAULT_BRANDING } from "@/lib/types/branding";
import { ExternalPortalShell, TokenStatePage } from "@/components/external-portal";
import { AecPortalLanding } from "@/components/external-portal/AecPortalLanding";
import { loadShareRow, shareDenied } from "@/lib/spatial-walkthrough/share-resolve";
import { loadClientPortalLanding } from "@/lib/spatial-walkthrough/client-portal-load";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

function Unavailable() {
  return (
    <TokenStatePage
      state="unavailable"
      badge="Client portal"
      description="This link could not be opened. Request a new link from the sender."
    />
  );
}

export default async function DeliverableSharePage({ params }: PageProps) {
  const { token } = await params;
  if (!token || token.length < 10) return <Unavailable />;

  const walk = await loadShareRow(token);
  if (walk.row && !shareDenied(walk.row)) {
    const data = await loadClientPortalLanding({
      orgId: walk.row.org_id,
      walkthroughId: walk.row.walkthrough_id,
      token,
    });
    if (data) return <AecPortalLanding data={data} />;
  }

  const admin = createAdminClient();
  const { data: claimed } = await admin.rpc("claim_deliverable_view", { p_token: token });
  const access = Array.isArray(claimed) ? claimed[0] : claimed;
  if (access && typeof access === "object" && "org_id" in access) {
    const dat = access as { org_id: string; deliverable_type: string; role: string };
    let branding = DEFAULT_BRANDING;
    try {
      branding = await getOrgBranding(dat.org_id);
    } catch {
      branding = DEFAULT_BRANDING;
    }
    const brand = resolveBrandTheme({
      snapshot: { logoUrl: branding.logo_url, companyName: branding.brand_name, showPoweredBy: true },
      canHidePoweredBy: true,
    });
    return (
      <ExternalPortalShell
        portalLabel="Client portal"
        title={branding.brand_name}
        subtitle={`${dat.deliverable_type} · ${dat.role}`}
        orgName={branding.brand_name}
        orgLogoUrl={branding.logo_url}
        showFooter={false}
      >
        <AecPortalLanding
          data={{
            profile: "construction",
            projectName: branding.brand_name,
            location: null,
            latestCaptureAt: null,
            brand,
            hero: null,
            history: [],
            attention: { open: 0, urgent: 0, questions: 0 },
            documents: [],
            projects: [],
            compareAvailable: false,
            shareHref: null,
            token,
            items: [],
            activity: [],
            captureTree: [],
          }}
        />
      </ExternalPortalShell>
    );
  }

  return <Unavailable />;
}
