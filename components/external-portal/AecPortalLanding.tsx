import { ViewerBrandMark } from "@/components/shared/ViewerBrandMark";
import { SlateIcon } from "@/components/shared/SlateIcon";
import type { PortalLandingData } from "@/lib/spatial-walkthrough/portal-fixtures";
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

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-[var(--graphite-canvas)] text-[var(--graphite-text-header)]"
      data-testid="aec-portal"
      data-profile={data.profile}
      data-scene-visible={hero?.posterUrl ? "true" : "false"}
      data-visible-layer="hero"
    >
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <ViewerBrandMark logoUrl={data.brand.logoUrl} opacity={data.brand.logoOpacity ?? 0.88} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{data.projectName}</p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
              {[data.location, when(data.latestCaptureAt)].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <a href={`#activity`} className={`${btn} hidden sm:inline-flex`}>
            Activity
          </a>
          {data.brand.logoUrl && data.brand.showPoweredBy ? (
            <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
              <SlateIcon className="h-5 w-5" />
              Powered by Slate360
            </p>
          ) : null}
        </div>
      </header>

      {hero ? (
        <section className="relative min-h-[42dvh] w-full lg:min-h-[52dvh]" data-testid="portal-hero">
          {hero.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[var(--graphite-canvas)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--graphite-canvas)] via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Latest capture</p>
              <h1 className="text-xl font-semibold sm:text-2xl">{hero.title}</h1>
              <p className="text-sm text-[var(--graphite-text-body)]">{when(hero.capturedAt)} · {hero.kind}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={hero.href} className={btn}>Open Latest</a>
              {data.compareAvailable ? <a href={hero.href} className={`${btn} text-[var(--graphite-muted)]`}>Compare</a> : null}
              {data.shareHref ? <a href={data.shareHref} className={`${btn} text-[var(--graphite-muted)]`}>Share</a> : null}
            </div>
          </div>
        </section>
      ) : null}

      {immersive ? null : (
        <div className="flex flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
          <PortalAttention data={data} />
          {compact ? null : <PortalItemsRail data={data} />}
          <PortalHistoryRail data={data} />
          {compact ? null : <PortalDocsRail data={data} />}
          {compact ? null : <PortalActivityFeed data={data} />}
          {compact ? null : <PortalCaptureTree data={data} />}
        </div>
      )}
    </div>
  );
}
