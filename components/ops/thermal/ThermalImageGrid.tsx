"use client";

export type GridItem = {
  id: string;
  name: string;
  previewUrl?: string | null;
  flaggedCount?: number;
  /** ★ included in the report set. */
  inReport?: boolean;
};

/**
 * Selectable thumbnail grid — shows many images at once so the user can see what
 * they're choosing, with select-all / clear and per-item toggles. The grid area
 * scrolls internally; the surrounding chrome stays put.
 */
export function ThermalImageGrid({
  items,
  selected,
  onToggle,
  onToggleAll,
  onOpen,
  onToggleInReport,
  emptyText = "No images.",
}: {
  items: GridItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  /** When set, clicking the card opens it (e.g. in the workbench); the checkbox selects. */
  onOpen?: (id: string) => void;
  /** When set, renders a ★ corner that toggles the capture's include-in-report state. */
  onToggleInReport?: (id: string) => void;
  emptyText?: string;
}) {
  const allSelected = items.length > 0 && selected.size === items.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between pb-2">
        <p className="text-xs text-[var(--graphite-muted)]">
          {items.length} image{items.length === 1 ? "" : "s"}
          {selected.size ? ` · ${selected.size} selected` : ""}
        </p>
        {items.length ? (
          <button
            type="button"
            onClick={onToggleAll}
            className="rounded-lg border border-[var(--mobile-app-card-border)] px-2 py-1 text-xs font-semibold text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--graphite-muted)]">
          {emptyText}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2 pr-1">
            {items.map((it) => {
              const isSel = selected.has(it.id);
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => (onOpen ? onOpen(it.id) : onToggle(it.id))}
                    className={`group relative block aspect-[4/3] w-full overflow-hidden rounded-lg border bg-[#111827] transition-colors ${
                      isSel
                        ? "border-[var(--graphite-primary)] ring-2 ring-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)]"
                        : "border-[var(--mobile-app-card-border)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]"
                    }`}
                    title={onOpen ? `Open ${it.name}` : it.name}
                  >
                    {it.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.previewUrl} alt={it.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center px-1 text-center text-[9px] text-[var(--graphite-muted)]">
                        {it.name}
                      </span>
                    )}
                    <span
                      role="checkbox"
                      aria-checked={isSel}
                      onClick={(e) => { e.stopPropagation(); onToggle(it.id); }}
                      className={`absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold ${
                        isSel
                          ? "border-[var(--graphite-primary)] bg-[var(--graphite-primary)] text-black"
                          : "border-white/60 bg-black/40 text-transparent hover:text-white/70"
                      }`}
                    >
                      ✓
                    </span>
                    {it.flaggedCount ? (
                      <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--graphite-primary)] px-1 text-[9px] font-bold text-[var(--graphite-canvas)]">
                        {it.flaggedCount}
                      </span>
                    ) : null}
                    {onToggleInReport ? (
                      <span
                        role="checkbox"
                        aria-checked={Boolean(it.inReport)}
                        title={it.inReport ? "In report — click to remove" : "Add to report"}
                        onClick={(e) => { e.stopPropagation(); onToggleInReport(it.id); }}
                        className={`absolute bottom-4 right-1 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold leading-none ${
                          it.inReport
                            ? "border-[var(--graphite-primary)] bg-[var(--graphite-primary)] text-black"
                            : "border-white/60 bg-black/45 text-white/70 hover:text-white"
                        }`}
                      >
                        ★
                      </span>
                    ) : null}
                    <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[9px] text-white">
                      {it.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
