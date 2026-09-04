import type { PortalLandingData } from "@/lib/spatial-walkthrough/portal-fixtures";

export function SpatialReferencesIndex({ data }: { data: PortalLandingData }) {
  const items = data.items;
  const docs = data.documents;
  const questions = items.filter((i) => i.type === "question" || i.type === "note" || i.type === "rfi");
  const groups = [
    ["Items", items],
    ["Questions", questions],
    ["Documents", docs.map((d) => ({ id: d.id, title: d.title, href: d.href, locatorHref: d.locatorHref ?? null }))],
  ] as const;
  return (
    <aside data-testid="spatial-references-index" className="flex flex-col gap-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">All project</p>
      {groups.map(([label, rows]) =>
        rows.length ? (
          <section key={label}>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">{label}</p>
            <div className="flex flex-col gap-1">
              {rows.map((row) => (
                <a key={row.id} href={row.locatorHref || row.href} className="min-h-12 border border-white/10 px-3 py-3 text-sm">
                  {row.title}
                </a>
              ))}
            </div>
          </section>
        ) : null,
      )}
    </aside>
  );
}
