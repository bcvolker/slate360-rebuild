import type { PortalLandingData } from "@/lib/spatial-walkthrough/portal-fixtures";

/** Light client overview sections (theme B). Palette: --portal-* only. */

export const portalCard = "rounded-2xl border border-[var(--portal-line)] bg-[var(--portal-surface)]";
export const portalKicker = "text-xs font-semibold uppercase tracking-[0.07em] text-[var(--portal-accent)]";
const rowLink =
  "flex min-h-12 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--portal-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--portal-accent)]";
const meta = "shrink-0 text-xs text-[var(--portal-ink-muted)]";

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const sentence = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : s);

/** Small counts strip; each count links to the list it summarises. */
export function PortalAttention({ data }: { data: PortalLandingData }) {
  const caps = data.capabilities;
  const cards: Array<[string, number, string]> = [];
  if (caps?.items && data.attention.open) cards.push(["Open items", data.attention.open, `/portal/${data.token}/items`]);
  if (caps?.items && data.attention.questions) cards.push(["Needs reply", data.attention.questions, `/portal/${data.token}/items`]);
  if (caps?.documents && data.documents.length) cards.push(["Documents", data.documents.length, `/portal/${data.token}/documents`]);
  if (!cards.length) return null;
  return (
    <section data-testid="portal-attention" className="grid grid-cols-3 gap-3">
      {cards.map(([label, count, href]) => (
        <a key={label} href={href} className={`${portalCard} px-4 py-3 transition-colors hover:border-[var(--portal-accent-line)]`}>
          <p className="text-xs font-medium text-[var(--portal-ink-muted)]">{label}</p>
          <p className="font-serif text-2xl text-[var(--portal-ink)]">{count}</p>
        </a>
      ))}
    </section>
  );
}

export function PortalHistoryRail({ data }: { data: PortalLandingData }) {
  return (
    <section data-testid="portal-history">
      <p className={`${portalKicker} mb-3`}>History</p>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {data.history.map((row) => (
          <a key={row.id} href={row.href} className={`${portalCard} w-44 shrink-0 overflow-hidden sm:w-56`} data-surface="static">
            {row.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.posterUrl} alt="" className="aspect-video w-full object-cover" />
            ) : null}
            <p className="px-3 py-2 text-sm text-[var(--portal-ink)]">{when(row.capturedAt)}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function ListCard({
  id,
  title,
  allHref,
  children,
}: {
  id: string;
  title: string;
  allHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} data-testid={`portal-${id}`} className={`${portalCard} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--portal-line)] px-4 py-3">
        <p className={portalKicker}>{title}</p>
        {allHref ? (
          <a href={allHref} className="text-xs font-semibold text-[var(--portal-accent)] hover:underline">
            View all
          </a>
        ) : null}
      </div>
      <div className="divide-y divide-[var(--portal-line)]">{children}</div>
    </section>
  );
}

export function PortalItemsRail({ data }: { data: PortalLandingData }) {
  return (
    <ListCard id="items" title="Project items" allHref={`/portal/${data.token}/items`}>
      {data.items.map((item) => (
        <a key={item.id} href={item.href} className={rowLink}>
          <span className="line-clamp-2 break-words text-sm font-medium text-[var(--portal-ink)]">{item.title}</span>
          <span className={meta}>
            {sentence(item.type)} · {sentence(item.status)}
          </span>
        </a>
      ))}
    </ListCard>
  );
}

export function PortalDocsRail({ data }: { data: PortalLandingData }) {
  return (
    <ListCard id="documents" title="Documents" allHref={`/portal/${data.token}/documents`}>
      {/* Rows, not thumbnail cards: there is no real preview image for a document yet. */}
      {data.documents.map((doc) => (
        <a key={doc.id} href={doc.href} className={rowLink}>
          <span className="line-clamp-2 break-words text-sm font-medium text-[var(--portal-ink)]">{doc.title}</span>
          <span className={meta}>
            {doc.kind === "slatedrop" ? "File" : sentence(doc.kind)}
            {doc.locatorHref ? " · in the walkthrough" : ""}
          </span>
        </a>
      ))}
    </ListCard>
  );
}
