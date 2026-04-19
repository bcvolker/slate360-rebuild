import type { ReactNode } from "react";

export type PeopleRow = {
  key: string;
  primary: string;
  secondary?: string;
  badge?: string;
  actions?: ReactNode;
};

type Props = {
  title: string;
  subtitle?: string;
  rows: PeopleRow[];
  emptyLabel: string;
  /** When parent re-renders the same section we want to allow children to remount. */
  refreshKey?: number;
};

export function PeopleSection({ title, subtitle, rows, emptyLabel, refreshKey }: Props) {
  return (
    <section
      key={refreshKey}
      className="rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <header className="mb-3 border-b border-border pb-2">
        <h2 className="text-base font-medium text-foreground">{title}</h2>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </header>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{row.primary}</div>
                {row.secondary ? (
                  <div className="truncate text-xs text-muted-foreground">{row.secondary}</div>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {row.badge ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {row.badge}
                  </span>
                ) : null}
                {row.actions}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
