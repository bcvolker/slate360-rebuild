import type { PortalLandingData } from "@/lib/spatial-walkthrough/portal-fixtures";
import { viewerChromeCopy } from "@/lib/spatial-walkthrough/viewer-title";
import { PortalChrome } from "./PortalChrome";
import {
  PortalActivityFeed,
  PortalAttention,
  PortalCaptureTree,
  PortalDocsRail,
  PortalHistoryRail,
  PortalItemsRail,
} from "./PortalProjectSections";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const btn = "inline-flex min-h-12 min-w-12 items-center justify-center border border-white/20 px-4 text-sm";

export function AecPortalLanding({
  data,
  compact = false,
}: {
  data: PortalLandingData;
  compact?: boolean;
}) {
  const hero = data.hero;
  const immersive = data.profile === "marketing" || data.profile === "wayfinding";

  const reality = data.reality;

  return (
    <PortalChrome data={data} active="overview">
    <div
      data-testid="aec-portal"
      data-profile={data.profile}
      data-scene-visible={hero?.posterUrl ? "true" : "false"}
      data-visible-layer="hero"
    >
      {hero ? (
        <section
          className="relative min-h-[42dvh] w-full lg:min-h-[52dvh]"
          data-testid="portal-hero"
          data-surface="static"
        >
          {hero.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.posterUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[var(--graphite-canvas)]" />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--graphite-canvas)] via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div>
              <p className="text-xs text-[var(--graphite-muted)]">Latest capture</p>
              <h1 className="text-xl font-semibold sm:text-2xl">{viewerChromeCopy({ title: hero.title, projectName: data.projectName }).title}</h1>
              <p className="text-sm text-[var(--graphite-text-body)]">{when(hero.capturedAt)} · {hero.kind}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={hero.href} className={btn} data-testid="open-walkthrough">Open Walkthrough</a>
              {data.shareHref ? <a href={data.shareHref} className={`${btn} text-[var(--graphite-muted)]`}>Share</a> : null}
            </div>
          </div>
        </section>
      ) : null}

      {immersive ? null : (
        <div className="flex flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
          {reality ? (
            <section data-testid="portal-reality" className="grid gap-2 sm:grid-cols-3">
              {[
                ["Walkthrough", reality.walkthroughHref],
                ["3D Twin", reality.twinHref],
                ["360 Documentation", reality.stationsHref],
                ...(reality.aerialHref ? [["Aerial", reality.aerialHref] as const] : []),
              ].map(([label, href]) =>
                href ? (
                  <a key={label} href={href} className={`${btn} justify-start`}>{label}</a>
                ) : null,
              )}
            </section>
          ) : null}
          <PortalAttention data={data} />
          {compact ? null : <PortalItemsRail data={data} />}
          <PortalHistoryRail data={data} />
          {compact ? null : <PortalDocsRail data={data} />}
          {compact ? null : <PortalActivityFeed data={data} />}
          {compact ? null : <PortalCaptureTree data={data} />}
        </div>
      )}
    </div>
    </PortalChrome>
  );
}
