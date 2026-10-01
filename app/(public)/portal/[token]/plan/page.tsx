import { TokenStatePage } from "@/components/external-portal";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";

export const dynamic = "force-dynamic";

export default async function PortalPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadPortalByToken(token);
  if (!data) return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  return (
    <PortalChrome data={data} active="plan">
      <main className="px-4 py-8 sm:px-6" data-testid="portal-plan-page">
        <h1 className="text-xl font-semibold">Plan</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--graphite-text-body)]">
          Path, waypoints, and 360 stations use an approximate plan alignment from two or three known positions. This is visual navigation, not survey control.
        </p>
        <p className="mt-6 text-sm text-[var(--graphite-muted)]" data-testid="plan-raster-unavailable">
          The interactive overlay needs a screen raster from desktop processing. The PDF remains available in Documents.
        </p>
        {data.reality?.stationsHref ? (
          <a href={data.reality.stationsHref} className="mt-6 inline-flex min-h-12 items-center border border-white/20 px-4 text-sm">
            Open 360 stations
          </a>
        ) : null}
      </main>
    </PortalChrome>
  );
}
