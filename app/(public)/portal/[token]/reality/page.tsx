import { redirect } from "next/navigation";
import { Box, Footprints, Images, Plane } from "lucide-react";
import { TokenStatePage } from "@/components/external-portal";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { PortalList, PortalPage, portalSecondaryBtn } from "@/components/external-portal/PortalPage";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";
import { realitySectionLabel, sectionAllowed } from "@/lib/spatial-walkthrough/portal-gating";

export const dynamic = "force-dynamic";

function when(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Every packaged way into the record, one dense row each (only what is shared). */
export default async function PortalRealityPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadPortalByToken(token);
  if (!data) return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  if (!sectionAllowed(data, "reality")) redirect(`/portal/${token}`);
  const r = data.reality;
  const visit = data.hero ? `Site visit ${when(data.hero.capturedAt)}` : null;
  const rows = [
    r?.walkthroughHref
      ? { label: "Walkthrough", detail: "Walk the site in 360", href: r.walkthroughHref, image: data.hero?.posterUrl ?? null, Icon: Footprints }
      : null,
    r?.twinHref ? { label: "3D Scan", detail: "Look around the scanned site in 3D", href: r.twinHref, image: null, Icon: Box } : null,
    r?.stationsHref ? { label: "360 photos", detail: "Step between 360 photo points", href: r.stationsHref, image: null, Icon: Images } : null,
    r?.aerialHref ? { label: "Aerial", detail: "The site from above", href: r.aerialHref, image: null, Icon: Plane } : null,
  ].filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <PortalChrome data={data} active="reality">
      <PortalPage title={realitySectionLabel(data.capabilities)} meta={visit} testId="portal-reality-page">
        <PortalList count={rows.length} empty="Nothing here is shared yet.">
          {rows.map(({ label, detail, href, image, Icon }) => (
            <a key={label} href={href} className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--portal-canvas)]">
              <span className="flex min-w-0 items-center gap-4">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover sm:h-16 sm:w-28" />
                ) : (
                  <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded-lg border border-[var(--portal-line)] bg-[var(--portal-canvas)] text-[var(--portal-accent)] sm:h-16 sm:w-28">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-[var(--portal-ink)]">{label}</span>
                  <span className="block text-sm text-[var(--portal-ink-muted)]">{detail}</span>
                </span>
              </span>
              <span className={`${portalSecondaryBtn} shrink-0`}>Open</span>
            </a>
          ))}
        </PortalList>
      </PortalPage>
    </PortalChrome>
  );
}
