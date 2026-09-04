import { TokenStatePage } from "@/components/external-portal";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { PortalHistoryRail } from "@/components/external-portal/PortalProjectSections";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";

export const dynamic = "force-dynamic";

export default async function PortalHistoryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadPortalByToken(token);
  if (!data) return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  return (
    <PortalChrome data={data} active="history">
      <main className="px-4 py-8 sm:px-6" data-testid="portal-history-page">
        <PortalHistoryRail data={data} />
      </main>
    </PortalChrome>
  );
}
