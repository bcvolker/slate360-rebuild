"use client";

import { useMemo, useState } from "react";
import { useViewportInsets } from "@/lib/hooks/useViewportInsets";
import { captureItemToDraft } from "@/lib/types/site-walk-capture";
import { DEV_MOCK_CAPTURE_ITEMS } from "@/lib/dev/mock-site-walk";

type Props = {
  keyboardSim?: number;
};

export function DevNoteReviewSandbox({ keyboardSim }: Props) {
  const activeItem = DEV_MOCK_CAPTURE_ITEMS[0]!;
  const [draft, setDraft] = useState(() => captureItemToDraft(activeItem));
  const [locationLabel, setLocationLabel] = useState(activeItem.location_label ?? "");
  const { keyboardOffset } = useViewportInsets();
  const effectiveKeyboardOffset = keyboardSim ?? keyboardOffset;

  const chips = useMemo(
    () => [{ label: "Safety" }, { label: "Quality" }, { label: "Progress" }],
    [],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]">
      <header className="shrink-0 border-b border-[var(--mobile-app-card-border)] px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--graphite-muted)]">
          Note / review
        </p>
        <h1 className="mt-1 text-base font-bold text-[var(--graphite-text-header)]">
          {draft.title || activeItem.title}
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
            Field notes
          </span>
          <textarea
            data-testid="dev-note-field"
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            rows={6}
            placeholder="Type what happened, what changed, and who owns the next action…"
            className="mt-2 w-full resize-none rounded-2xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 py-3 text-sm leading-6 text-[var(--graphite-text-body)] outline-none ring-[var(--graphite-primary)] focus:ring-2"
            style={{ WebkitUserSelect: "text", userSelect: "text" }}
          />
        </label>

        <label className="mt-3 block">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
            Location
          </span>
          <input
            value={locationLabel}
            onChange={(event) => setLocationLabel(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 py-2.5 text-sm font-medium text-[var(--graphite-text-body)] outline-none ring-[var(--graphite-primary)] focus:ring-2"
            placeholder="e.g. Level 2 · East corridor"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              className="rounded-full border border-[var(--mobile-app-card-border)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--graphite-muted)]"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <footer
        className="shrink-0 border-t border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_94%,transparent)] px-4 py-3 backdrop-blur-xl"
        style={{ paddingBottom: effectiveKeyboardOffset > 0 ? effectiveKeyboardOffset + 12 : undefined }}
      >
        <button
          type="button"
          data-testid="dev-save-button"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--graphite-primary)_35%,transparent)] bg-[var(--graphite-primary)] px-5 text-sm font-bold text-[var(--graphite-text-header)] shadow-[var(--mobile-app-card-glow-primary)]"
        >
          Save
        </button>
      </footer>
    </div>
  );
}
