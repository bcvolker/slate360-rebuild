import { ViewerBrandMark } from "@/components/shared/ViewerBrandMark";
import type { PortalLandingData } from "@/lib/spatial-walkthrough/portal-fixtures";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
        {data.brand.logoUrl && data.brand.showPoweredBy ? (
          <p className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
            Powered by Slate360
          </p>
        ) : null}
      </header>

      {hero ? (
        <section className="relative min-h-[45dvh] w-full lg:min-h-[55dvh]" data-testid="portal-hero">
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
              <p className="text-sm text-[var(--graphite-text-body)]">{when(hero.capturedAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={hero.href} className="inline-flex min-h-11 items-center border border-white/20 px-4 text-sm">
                Open Latest
              </a>
              {data.compareAvailable ? (
                <a href={hero.href} className="inline-flex min-h-11 items-center border border-white/10 px-4 text-sm text-[var(--graphite-muted)]">
                  Compare
                </a>
              ) : null}
              {data.shareHref ? (
                <a href={data.shareHref} className="inline-flex min-h-11 items-center border border-white/10 px-4 text-sm text-[var(--graphite-muted)]">
                  Share
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {immersive ? null : (
        <div className="flex flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
          <section data-testid="portal-history">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">History</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {data.history.map((row) => (
                <a key={row.id} href={row.href} className="w-44 shrink-0 sm:w-56">
                  <div className="aspect-video overflow-hidden bg-white/[0.04]">
                    {row.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.posterUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-sm">{when(row.capturedAt)}</p>
                  <p className="truncate font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
                    {row.kind} · {row.status}
                  </p>
                </a>
              ))}
            </div>
          </section>

          <section data-testid="portal-attention" className="flex flex-wrap gap-6">
            {[
              ["Open", data.attention.open],
              ["Urgent", data.attention.urgent],
              ["Questions", data.attention.questions],
            ].map(([label, count]) => (
              <p key={String(label)} className="text-sm">
                <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">{label}</span>
                <strong>{count}</strong>
              </p>
            ))}
          </section>

          {compact ? null : (
            <section data-testid="portal-documents">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Documents</p>
              <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
                {data.documents.map((doc) => (
                  <a key={doc.id} href={doc.href} className="w-40 shrink-0 lg:w-auto">
                    <div className="aspect-[4/3] overflow-hidden bg-white/[0.04]">
                      {doc.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={doc.thumbUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <p className="mt-2 truncate text-sm">{doc.title}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{doc.kind}</p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {data.projects.length > 1 ? (
            <section data-testid="portal-projects">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Projects</p>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {data.projects.map((project) => (
                  <a key={project.id} href={project.href} className="w-40 shrink-0">
                    <div className="aspect-video overflow-hidden bg-white/[0.04]">
                      {project.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={project.thumbUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <p className="mt-2 truncate text-sm">{project.name}</p>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
