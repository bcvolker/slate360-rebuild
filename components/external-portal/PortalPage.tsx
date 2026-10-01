import { portalCard } from "./PortalProjectSections";

/** Shared light frame for portal sub-pages: one header row, then dense content. */
export function PortalPage({
  title,
  meta,
  filters,
  testId,
  children,
}: {
  title: string;
  meta?: string | null;
  filters?: Array<{ label: string; href: string; active: boolean; count?: number }>;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6" data-testid={testId}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl text-[var(--portal-ink)] sm:text-[1.7rem]">{title}</h1>
          {meta ? <p className="text-sm text-[var(--portal-ink-muted)]">{meta}</p> : null}
        </div>
        {filters && filters.length > 1 ? (
          // Wraps instead of scrolling sideways.
          <nav aria-label="Filter" className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <a
                key={f.label}
                href={f.href}
                aria-current={f.active ? "true" : undefined}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
                  f.active
                    ? "border-[var(--portal-accent-line)] bg-[var(--portal-accent-soft)] text-[var(--portal-ink)]"
                    : "border-[var(--portal-line)] bg-[var(--portal-surface)] text-[var(--portal-ink-muted)] hover:text-[var(--portal-ink)]"
                }`}
              >
                {f.label}
                {typeof f.count === "number" ? <span className="text-xs text-[var(--portal-ink-muted)]">{f.count}</span> : null}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
      {children}
    </main>
  );
}

/** A list card with dense rows; shows one short line when a filter leaves nothing. */
export function PortalList({ empty, children, count }: { empty: string; count: number; children: React.ReactNode }) {
  return (
    <section className={`${portalCard} overflow-hidden`}>
      {count ? (
        <div className="divide-y divide-[var(--portal-line)]">{children}</div>
      ) : (
        <p className="px-4 py-4 text-sm text-[var(--portal-ink-muted)]">{empty}</p>
      )}
    </section>
  );
}

export const portalRow = "flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4";
export const portalSecondaryBtn =
  "inline-flex h-9 items-center rounded-lg border border-[var(--portal-line)] bg-[var(--portal-surface)] px-3 text-sm font-medium text-[var(--portal-ink)] transition-colors hover:border-[var(--portal-accent-line)]";
export const portalPrimaryBtn =
  "inline-flex h-11 items-center justify-center rounded-[10px] bg-[var(--portal-accent)] px-5 text-sm font-semibold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] focus-visible:ring-offset-2";

export const sentence = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "");
export const docKindLabel = (kind: string) => (kind === "slatedrop" ? "File" : sentence(kind));
