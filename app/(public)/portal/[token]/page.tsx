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
      share: walk.row,
    });
    if (data) return <AecPortalLanding data={data} />;
  }

  const admin = createAdminClient();
  const { data: claimed } = await admin.rpc("claim_deliverable_view", { p_token: token });
  const access = Array.isArray(claimed) ? claimed[0] : claimed;
  if (access && typeof access === "object" && "org_id" in access) {
    const dat = access as { org_id: string };
    let branding = DEFAULT_BRANDING;
    try {
      branding = await getOrgBranding(dat.org_id);
    } catch {
      branding = DEFAULT_BRANDING;
    }
    // Legacy deliverable tokens carry no packaged content, so show one honest line, not an empty dashboard.
    return (
      <ExternalPortalShell
        portalLabel="Client portal"
        title={branding.brand_name}
        orgName={branding.brand_name}
        orgLogoUrl={branding.logo_url}
        showFooter={false}
      >
        <TokenStatePage
          state="empty"
          badge="Client portal"
          title="Nothing is shared on this link yet"
          description={`Ask ${branding.brand_name} for the current portal link.`}
          showShell={false}
        />
      </ExternalPortalShell>
    );
  }

  return <Unavailable />;
}
