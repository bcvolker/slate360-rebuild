import type { PortalLandingData } from "@/lib/spatial-walkthrough/portal-fixtures";
import { viewerChromeCopy } from "@/lib/spatial-walkthrough/viewer-title";
import { portalSections } from "@/lib/spatial-walkthrough/portal-gating";
import { PortalChrome } from "./PortalChrome";
import { TokenStatePage } from "./TokenStatePage";
import { PortalAttention, PortalDocsRail, PortalHistoryRail, PortalItemsRail, portalCard, portalKicker } from "./PortalProjectSections";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const primaryBtn =
  "inline-flex h-11 items-center justify-center rounded-[10px] bg-[var(--portal-accent)] px-5 text-sm font-semibold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] focus-visible:ring-offset-2";

/** Ways into the record besides the hero's walkthrough (which has its own button). */
function realityEntries(data: PortalLandingData, heroOpensWalk: boolean): Array<{ label: string; detail: string; href: string }> {
  const r = data.reality;
  if (!r) return [];
  const out: Array<{ label: string; detail: string; href: string }> = [];
  // One walkthrough entry only: skip the tile when the hero already opens it.
  if (r.walkthroughHref && !heroOpensWalk) out.push({ label: "Walkthrough", detail: "Walk the site in 360", href: r.walkthroughHref });
  if (r.twinHref) out.push({ label: "3D Scan", detail: "Look around the scanned site in 3D", href: r.twinHref });
  if (r.stationsHref) out.push({ label: "360 photos", detail: "Step between 360 photo points", href: r.stationsHref });
  if (r.aerialHref) out.push({ label: "Aerial", detail: "The site from above", href: r.aerialHref });
  return out;
}

/** Light client overview (theme B): latest capture, ways in, counts, then items and documents. */
export function AecPortalLanding({ data, compact = false }: { data: PortalLandingData; compact?: boolean }) {
  const hero = data.hero;
  const immersive = data.profile === "marketing" || data.profile === "wayfinding";
  const heroOpensWalk = Boolean(hero && data.capabilities?.walkthrough !== false);
  const entries = realityEntries(data, heroOpensWalk);
  const showItems = !compact && data.items.length > 0;
  const showDocs = !compact && data.documents.length > 0;
  const nothing = !hero && portalSections(data.capabilities).length === 1;

  return (
    <PortalChrome data={data} active="overview">
      <div data-testid="aec-portal" data-profile={data.profile} data-scene-visible={hero?.posterUrl ? "true" : "false"}>
        {nothing ? (
          <div className="flex min-h-[60dvh] flex-col" data-testid="portal-nothing-shared">
            <TokenStatePage
              state="empty"
              showShell={false}
              title="Nothing shared yet"
              description="Nothing is shared on this link yet. Ask the sender for an updated link."
            />
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
            {hero ? (
              // One wide card: image beside the title, the other ways in, and the single
              // walkthrough button. Sparse portals stay one compact card, never a blank column.
              <section
                className={`${portalCard} grid overflow-hidden lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]`}
                data-testid="portal-hero"
                data-surface="static"
              >
                {hero.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hero.posterUrl} alt="" className="aspect-[16/9] h-full w-full object-cover lg:aspect-auto lg:min-h-[300px]" />
                ) : null}
                <div className="flex flex-col gap-4 p-5">
                  <div className="min-w-0">
                    <p className={portalKicker}>Latest site visit</p>
                    <h1 className="mt-1 font-serif text-2xl text-[var(--portal-ink)] sm:text-[1.7rem]">
                      {viewerChromeCopy({ title: hero.title, projectName: data.projectName }).title}
                    </h1>
                    <p className="mt-0.5 text-sm text-[var(--portal-ink-muted)]">{when(hero.capturedAt)}</p>
                  </div>
                  {entries.length ? (
                    <nav data-testid="portal-reality" aria-label="More in this record" className="divide-y divide-[var(--portal-line)] rounded-xl border border-[var(--portal-line)]">
                      {entries.map((e) => (
                        <a key={e.label} href={e.href} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--portal-canvas)]">
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-[var(--portal-ink)]">{e.label}</span>
                            <span className="block text-xs text-[var(--portal-ink-muted)]">{e.detail}</span>
                          </span>
                          <span aria-hidden className="text-[var(--portal-accent)]">→</span>
                        </a>
                      ))}
                    </nav>
                  ) : null}
                  {heroOpensWalk ? (
                    <a href={hero.href} className={`${primaryBtn} mt-auto w-full sm:w-auto sm:self-start`} data-testid="open-walkthrough">
                      Open walkthrough
                    </a>
                  ) : null}
                </div>
              </section>
            ) : entries.length ? (
              <nav data-testid="portal-reality" aria-label="Ways into the record" className="grid gap-3 sm:grid-cols-3">
                {entries.map((e) => (
                  <a
                    key={e.label}
                    href={e.href}
                    className={`${portalCard} flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:border-[var(--portal-accent-line)]`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--portal-ink)]">{e.label}</span>
                      <span className="block text-xs text-[var(--portal-ink-muted)]">{e.detail}</span>
                    </span>
                    <span aria-hidden className="text-[var(--portal-accent)]">→</span>
                  </a>
                ))}
              </nav>
            ) : null}

            {immersive ? null : (
              <>
                <PortalAttention data={data} />
                {showItems || showDocs ? (
                  <div className={`grid items-start gap-4 ${showItems && showDocs ? "lg:grid-cols-2" : ""}`}>
                    {showItems ? <PortalItemsRail data={data} /> : null}
                    {showDocs ? <PortalDocsRail data={data} /> : null}
                  </div>
                ) : null}
                {data.history.length ? <PortalHistoryRail data={data} /> : null}
              </>
            )}
          </div>
        )}
      </div>
    </PortalChrome>
  );
}
