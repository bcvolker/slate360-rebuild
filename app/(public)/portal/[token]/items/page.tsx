import { TokenStatePage } from "@/components/external-portal";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { SpatialReferencesIndex } from "@/components/external-portal/SpatialReferencesIndex";
import { PortalItemsRail } from "@/components/external-portal/PortalProjectSections";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";

export const dynamic = "force-dynamic";

export default async function PortalItemsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadPortalByToken(token);
  if (!data) return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  return (
    <PortalChrome data={data} active="items">
      <main className="px-4 py-8 sm:px-6" data-testid="portal-items-page">
          <PortalItemsRail data={data} />
          <div className="mt-8">
            <SpatialReferencesIndex data={data} />
          </div>
      </main>
    </PortalChrome>
  );
}
