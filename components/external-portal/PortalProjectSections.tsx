import type { PortalLandingData } from "@/lib/spatial-walkthrough/portal-fixtures";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const btn = "inline-flex min-h-12 items-center border border-white/20 px-4 text-sm";

export function PortalAttention({ data }: { data: PortalLandingData }) {
  return (
    <section data-testid="portal-attention" className="grid grid-cols-3 gap-3">
      {[
        ["Open items", data.attention.open, `/portal/${data.token}#items`],
        ["Needs reply", data.attention.questions, `/portal/${data.token}#activity`],
        ["Documents", data.documents.length, `/portal/${data.token}/documents`],
      ].map(([label, count, href]) => (
        <a key={String(label)} href={String(href)} className="min-h-12 border border-white/10 px-3 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">{label}</p>
          <p className="text-xl font-semibold">{count}</p>
        </a>
      ))}
    </section>
  );
}

export function PortalHistoryRail({ data }: { data: PortalLandingData }) {
  return (
    <section data-testid="portal-history">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">History</p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {data.history.map((row) => (
                <a key={row.id} href={row.href} className="w-44 shrink-0 sm:w-56" data-surface="static">
            <div className="aspect-video overflow-hidden bg-white/[0.04]">
              {row.posterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.posterUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <p className="mt-2 truncate text-sm">{when(row.capturedAt)}</p>
            <p className="truncate font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
              Visit
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}

export function PortalItemsRail({ data }: { data: PortalLandingData }) {
  return (
    <section id="items" data-testid="portal-items">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Project items</p>
      <div className="flex flex-col gap-2">
        {data.items.map((item) => (
          <a key={item.id} href={item.href} className="flex min-h-12 items-center justify-between gap-3 border border-white/10 px-3">
            <span className="truncate text-sm">{item.title}</span>
            <span className="shrink-0 font-mono text-[10px] uppercase text-[var(--graphite-muted)]">
              {item.type} · {item.status}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export function PortalDocsRail({ data }: { data: PortalLandingData }) {
  return (
    <section id="documents" data-testid="portal-documents">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Documents</p>
        <a href={`/portal/${data.token}/documents`} className="font-mono text-[10px] uppercase text-[var(--graphite-primary)]">
          View all
        </a>
      </div>
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
                    <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
                      {doc.kind}
                      {doc.locatorHref ? " · 1 spatial reference" : ""}
                    </p>
                    {doc.locatorHref ? (
                      <span className="mt-1 block font-mono text-[10px] uppercase text-[var(--graphite-primary)]">View locations</span>
                    ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}

export function PortalActivityFeed({ data }: { data: PortalLandingData }) {
  return (
    <section id="activity" data-testid="portal-activity">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Activity</p>
      <div className="flex flex-col gap-3">
        {data.activity.map((row) => {
          const item = data.items.find((i) => i.id === row.id);
          return (
            <article key={row.id} className="flex min-h-12 items-center gap-3 border border-white/10 px-3 py-3" data-surface="static">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/20 font-mono text-[10px] uppercase">
                {row.kind.slice(0, 3)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{row.title}</p>
                <p className="font-mono text-[10px] uppercase text-[var(--graphite-muted)]">
                  {data.projectName} · {row.kind} · {item?.status ?? "open"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row">
                <a href={row.href} className={`${btn} min-h-12`}>Open</a>
                {item?.locatorHref ? (
                  <a href={item.locatorHref} className={`${btn} min-h-12`}>Open at location</a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function PortalCaptureTree({ data }: { data: PortalLandingData }) {
  return (
    <section data-testid="portal-capture-tree">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Capture graph</p>
      <ul className="flex flex-col gap-2">
        {data.captureTree.map((node) => (
          <li key={node.label}>
            {node.href ? (
              <a href={node.href} className={`${btn} w-full justify-between`}>
                <span>{node.label}</span>
                <span className="font-mono text-[10px] uppercase text-[var(--graphite-muted)]">{node.status}</span>
              </a>
            ) : (
              <p className="text-sm text-[var(--graphite-muted)]">{node.label} · not captured</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
