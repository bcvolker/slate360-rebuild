"use client";

import { useState } from "react";
import { ArrowLeft, Check, Layers, Square } from "lucide-react";

export type PlanSheet = {
  id: string;
  /** Sheet number, e.g. "A-101". */
  number: string;
  /** Human label, e.g. "Level 1 — Floor plan". */
  label: string;
  /** Rasterized thumbnail URL, or null while converting / unavailable. */
  thumbUrl: string | null;
  /** Pins placed on this sheet across prior walks (drives Additive). */
  priorPinCount: number;
  /** True while the sheet is still rasterizing. */
  converting?: boolean;
};

export type PlanSet = {
  id: string;
  name: string;
  sheets: PlanSheet[];
};

type Mode = "clean" | "additive";

type Props = {
  walkLabel: string;
  planSets: PlanSet[];
  onBack: () => void;
  onStart: (args: { planSetId: string; sheetId: string; mode: Mode }) => void;
};

/**
 * Graphite-Glass plan picker — the screen after "Walk with drawings". Pick a
 * plan set → pick a sheet → choose CLEAN (fresh) or ADDITIVE (prior walks' pins
 * as a dimmed, read-only underlay to build on). Matches WalkStartSheet's grammar.
 * Backend-ready: plan_sets + site_walk_items.plan_attachments already exist.
 */
export function PlanPickerSheet({ walkLabel, planSets, onBack, onStart }: Props) {
  const [activeSetId, setActiveSetId] = useState(planSets[0]?.id ?? "");
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("clean");

  const activeSet = planSets.find((s) => s.id === activeSetId) ?? planSets[0];
  const sheet = activeSet?.sheets.find((s) => s.id === sheetId) ?? null;
  const priorPins = sheet?.priorPinCount ?? 0;

  // Most useful default: if the chosen sheet has history, lean Additive.
  function pickSheet(id: string) {
    setSheetId(id);
    const next = activeSet?.sheets.find((s) => s.id === id);
    setMode((next?.priorPinCount ?? 0) > 0 ? "additive" : "clean");
  }

  return (
    <section
      className="relative flex min-h-0 flex-1 flex-col bg-[var(--graphite-canvas)] px-4 pb-safe pt-[max(env(safe-area-inset-top),1rem)] text-white"
      data-capture-chrome="plan-picker-sheet"
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex min-h-9 w-fit items-center gap-2 rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] px-3 text-xs font-semibold text-white/80 backdrop-blur-md transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back
      </button>

      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-primary)]">
        Choose a drawing
      </p>
      <h1 className="mt-1 truncate text-lg font-bold text-white">{walkLabel}</h1>

      {/* Plan set chips (only if more than one) */}
      {planSets.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {planSets.map((set) => {
            const active = set.id === activeSetId;
            return (
              <button
                key={set.id}
                type="button"
                onClick={() => {
                  setActiveSetId(set.id);
                  setSheetId(null);
                }}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-white"
                    : "border-[var(--mobile-app-card-border)] text-white/60 hover:text-white"
                }`}
              >
                {set.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Sheet grid */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 overflow-y-auto">
        {(activeSet?.sheets ?? []).map((s) => {
          const selected = s.id === sheetId;
          return (
            <button
              key={s.id}
              type="button"
              disabled={s.converting}
              onClick={() => pickSheet(s.id)}
              className={`relative overflow-hidden rounded-2xl border text-left transition ${
                selected
                  ? "border-[var(--graphite-primary)] ring-2 ring-[var(--accent-border-green)]"
                  : "border-[var(--mobile-app-card-border)] hover:border-white/30"
              } ${s.converting ? "opacity-50" : ""}`}
            >
              <div className="aspect-[4/3] w-full bg-white/[0.04]">
                {s.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.thumbUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-wide text-white/40">
                    {s.converting ? "Processing…" : "No preview"}
                  </div>
                )}
              </div>
              <div className="px-2.5 py-1.5">
                <p className="truncate text-xs font-bold text-white">{s.number}</p>
                <p className="truncate text-[10px] text-white/55">{s.label}</p>
                {s.priorPinCount > 0 ? (
                  <p className="mt-0.5 text-[10px] font-semibold text-[var(--graphite-primary)]">
                    {s.priorPinCount} prior pin{s.priorPinCount === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
              {selected ? (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-black">
                  <Check className="h-3 w-3" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Clean vs Additive — only once a sheet is chosen */}
      {sheet ? (
        <div className="mt-3 shrink-0">
          <p className="mb-2 text-xs font-semibold text-white/70">How should pins work?</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setMode("clean")}
              className={`rounded-2xl border p-3 text-left transition ${
                mode === "clean"
                  ? "border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
                  : "border-[var(--mobile-app-card-border)] hover:border-white/30"
              }`}
            >
              <Square className="h-4 w-4 text-white/70" />
              <p className="mt-1.5 text-sm font-bold text-white">Clean</p>
              <p className="text-[11px] leading-snug text-white/55">Fresh drawing — no prior pins shown.</p>
            </button>
            <button
              type="button"
              disabled={priorPins === 0}
              onClick={() => setMode("additive")}
              className={`rounded-2xl border p-3 text-left transition ${
                priorPins === 0
                  ? "border-[var(--mobile-app-card-border)] opacity-40"
                  : mode === "additive"
                    ? "border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
                    : "border-[var(--mobile-app-card-border)] hover:border-white/30"
              }`}
            >
              <Layers className="h-4 w-4 text-white/70" />
              <p className="mt-1.5 text-sm font-bold text-white">Additive</p>
              <p className="text-[11px] leading-snug text-white/55">
                {priorPins === 0
                  ? "No prior pins on this drawing yet."
                  : `Show ${priorPins} prior pin${priorPins === 1 ? "" : "s"} as a read-only underlay.`}
              </p>
            </button>
          </div>

          <button
            type="button"
            onClick={() => activeSet && onStart({ planSetId: activeSet.id, sheetId: sheet.id, mode })}
            className="mt-3 flex min-h-14 w-full items-center justify-center rounded-2xl bg-[var(--graphite-primary)] text-sm font-bold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90"
          >
            Start walk on {sheet.number}
          </button>
        </div>
      ) : null}
    </section>
  );
}
