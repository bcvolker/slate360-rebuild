import { TokenStatePage } from "@/components/external-portal";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";

export const dynamic = "force-dynamic";

const btn = "inline-flex min-h-12 items-center border border-white/20 px-4 text-sm";

export default async function PortalRealityPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadPortalByToken(token);
  if (!data) return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  const r = data.reality;
  const rows = [
    ["Walkthrough", r?.walkthroughHref],
    ["3D Twin", r?.twinHref],
    ["360 Documentation", r?.stationsHref],
    ...(r?.aerialHref ? [["Aerial", r.aerialHref] as const] : []),
  ];
  return (
    <PortalChrome data={data} active="reality">
      <main className="flex flex-col gap-3 px-4 py-8 sm:px-6" data-testid="portal-reality-page">
        <h1 className="text-xl font-semibold">Reality</h1>
        {rows.map(([label, href]) =>
          href ? (
            <a key={label} href={href} className={btn}>{label}</a>
          ) : (
            <p key={label} className="min-h-12 border border-white/10 px-4 py-3 text-sm text-[var(--graphite-muted)]">
              {label} is not on this visit.
            </p>
          ),
        )}
      </main>
    </PortalChrome>
  );
}
