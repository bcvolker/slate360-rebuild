"use client";

/**
 * CustomizableWidgetBoard — a desktop dashboard board whose widgets the user can
 * drag to reorder, resize (column span), and collapse/expand. Layout persists to
 * localStorage per `boardId`. No external DnD dependency: uses native HTML5 drag.
 *
 * Design intent (docs/design/GRAPHITE_GLASS.md): widgets TILE a 12-col grid so the
 * board fills its width with no giant gaps; "Edit layout" reveals drag + resize
 * affordances. Pair with DashboardContentFrame so the board fills height without
 * the page itself scrolling.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GripVertical, Maximize2, Minimize2, ChevronDown, RotateCcw, LayoutGrid } from "lucide-react";

export type BoardWidget = {
  id: string;
  title: string;
  /** Columns out of 12. Defaults to 4. */
  defaultSpan?: number;
  render: () => ReactNode;
};

type WidgetState = { id: string; span: number; collapsed: boolean };

const SPAN_STEPS = [3, 4, 6, 8, 12] as const;
const MIN_SPAN = SPAN_STEPS[0];
const MAX_SPAN = SPAN_STEPS[SPAN_STEPS.length - 1];

function clampSpan(span: number): number {
  return Math.max(MIN_SPAN, Math.min(MAX_SPAN, span));
}

function nextSpan(span: number): number {
  const idx = SPAN_STEPS.findIndex((s) => s >= span);
  return SPAN_STEPS[Math.min(idx + 1, SPAN_STEPS.length - 1)];
}

function defaultState(widgets: BoardWidget[]): WidgetState[] {
  return widgets.map((w) => ({ id: w.id, span: clampSpan(w.defaultSpan ?? 4), collapsed: false }));
}

/** Merge a saved layout with the current widget set: keep saved order/size for
 * known ids, append new widgets, drop ids that no longer exist. */
function reconcile(saved: WidgetState[], widgets: BoardWidget[]): WidgetState[] {
  const known = new Map(widgets.map((w) => [w.id, w]));
  const out: WidgetState[] = [];
  for (const s of saved) {
    if (known.has(s.id)) {
      out.push({ id: s.id, span: clampSpan(s.span), collapsed: !!s.collapsed });
      known.delete(s.id);
    }
  }
  for (const w of known.values()) out.push({ id: w.id, span: clampSpan(w.defaultSpan ?? 4), collapsed: false });
  return out;
}

const SPAN_CLASS: Record<number, string> = {
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  6: "lg:col-span-6",
  8: "lg:col-span-8",
  12: "lg:col-span-12",
};

export default function CustomizableWidgetBoard({
  boardId,
  widgets,
}: {
  boardId: string;
  widgets: BoardWidget[];
}) {
  const storageKey = `slate360:board:${boardId}:v1`;
  const [editing, setEditing] = useState(false);
  const [layout, setLayout] = useState<WidgetState[]>(() => defaultState(widgets));
  const [dragId, setDragId] = useState<string | null>(null);
  const hydrated = useRef(false);

  // Hydrate from localStorage once on mount (client only), reconciled to current widgets.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const saved = raw ? (JSON.parse(raw) as WidgetState[]) : null;
      setLayout(saved && Array.isArray(saved) ? reconcile(saved, widgets) : defaultState(widgets));
    } catch {
      setLayout(defaultState(widgets));
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Reconcile if the widget set changes after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    setLayout((cur) => reconcile(cur, widgets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets.map((w) => w.id).join(",")]);

  const persist = useCallback(
    (next: WidgetState[]) => {
      setLayout(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage unavailable — keep in-memory only */
      }
    },
    [storageKey],
  );

  const widgetMap = useMemo(() => new Map(widgets.map((w) => [w.id, w])), [widgets]);

  const reorder = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const from = layout.findIndex((w) => w.id === fromId);
      const to = layout.findIndex((w) => w.id === toId);
      if (from < 0 || to < 0) return;
      const next = layout.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      persist(next);
    },
    [layout, persist],
  );

  const cycleSpan = useCallback(
    (id: string) => persist(layout.map((w) => (w.id === id ? { ...w, span: nextSpan(w.span) === w.span ? MIN_SPAN : nextSpan(w.span) } : w))),
    [layout, persist],
  );

  const toggleCollapse = useCallback(
    (id: string) => persist(layout.map((w) => (w.id === id ? { ...w, collapsed: !w.collapsed } : w))),
    [layout, persist],
  );

  const reset = useCallback(() => persist(defaultState(widgets)), [persist, widgets]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-end gap-2">
        {editing && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            editing
              ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)]"
              : "border-white/10 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> {editing ? "Done" : "Customize layout"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          {layout.map((w) => {
            const widget = widgetMap.get(w.id);
            if (!widget) return null;
            const isDragTarget = dragId && dragId !== w.id;
            return (
              <section
                key={w.id}
                className={`${SPAN_CLASS[w.span] ?? "lg:col-span-4"} flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-[var(--mobile-app-card-bg)] transition-colors ${
                  dragId === w.id
                    ? "border-[color-mix(in_srgb,var(--graphite-primary)_55%,transparent)] opacity-60"
                    : isDragTarget
                      ? "border-dashed border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]"
                      : "border-[var(--mobile-app-card-border)]"
                }`}
                onDragOver={(e) => {
                  if (editing && dragId) e.preventDefault();
                }}
                onDrop={() => {
                  if (editing && dragId) reorder(dragId, w.id);
                  setDragId(null);
                }}
              >
                <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
                  {editing && (
                    <span
                      draggable
                      onDragStart={() => setDragId(w.id)}
                      onDragEnd={() => setDragId(null)}
                      className="-ml-1 cursor-grab text-[var(--graphite-muted)] active:cursor-grabbing"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                  )}
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--graphite-text-header)]">
                    {widget.title}
                  </h3>
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => cycleSpan(w.id)}
                      className="rounded-md p-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-primary)]"
                      aria-label="Resize widget"
                      title={`Width: ${w.span}/12 — click to resize`}
                    >
                      {w.span >= MAX_SPAN ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleCollapse(w.id)}
                      className="rounded-md p-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
                      aria-label={w.collapsed ? "Expand" : "Collapse"}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${w.collapsed ? "-rotate-90" : ""}`} />
                    </button>
                  )}
                </header>
                {!w.collapsed && <div className="min-h-0 flex-1 overflow-auto p-4">{widget.render()}</div>}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
