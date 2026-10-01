"use client";

import { useState } from "react";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { DEFAULT_LOOK_CONE, type LookCone } from "@/lib/spatial-tour/look-cone";

const WIDTHS = [
  { half: 110, label: "Wide · 220°" },
  { half: 90, label: "Standard · 180°" },
  { half: 70, label: "Narrow · 140°" },
] as const;
const FLOORS = [
  { deg: -15, label: "Eye level and up" },
  { deg: -30, label: "Down to the floor ahead" },
  { deg: -45, label: "Steep down" },
] as const;
const field = "min-h-11 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 text-sm text-[var(--graphite-text-header)]";
const dis = "disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Framing-first privacy: the forward cone clients are locked to. The operator walks behind
 * the mast and under the camera, so a forward cone that stops short of straight down keeps
 * them out of every published frame without painting anything.
 */
export function TourLookConePanel({
  cone,
  locked,
  busy,
  canUseView,
  onSave,
  getHeading,
}: {
  cone: LookCone | null;
  locked: boolean;
  busy: boolean;
  /** The player has a frame, so "forward = where I'm looking" is meaningful. */
  canUseView: boolean;
  onSave: (cone: LookCone) => void;
  getHeading: () => number | null;
}) {
  const base = cone ?? DEFAULT_LOOK_CONE;
  const [half, setHalf] = useState<number>(base.halfWidthDeg);
  const [floor, setFloor] = useState<number>(base.pitchMinDeg);

  return (
    <section className={t.sectionCard} data-testid="tour-look-cone">
      <div className="flex items-center justify-between gap-2">
        <p className={t.eyebrow}>Published view</p>
        <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">
          {cone ? `${Math.round(cone.halfWidthDeg * 2)}° · down to ${cone.pitchMinDeg}°` : "Not set"}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--graphite-muted)]">
        Clients can only look inside this view, and every still is framed inside it. Point the player where you walked, so you stay behind and under the camera.
      </p>
      {locked ? null : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select className={field} value={half} onChange={(e) => setHalf(Number(e.target.value))} aria-label="How wide clients can look">
            {WIDTHS.map((w) => (
              <option key={w.half} value={w.half}>{w.label}</option>
            ))}
          </select>
          <select className={field} value={floor} onChange={(e) => setFloor(Number(e.target.value))} aria-label="How far down clients can look">
            {FLOORS.map((f) => (
              <option key={f.deg} value={f.deg}>{f.label}</option>
            ))}
          </select>
          <button
            type="button"
            className={`${cone ? t.secondaryButton : t.primaryButton} ${dis} sm:col-span-2`}
            disabled={busy || !canUseView}
            onClick={() => {
              const heading = getHeading();
              if (heading == null) return;
              onSave({ headingDeg: heading, halfWidthDeg: half, pitchMinDeg: floor, pitchMaxDeg: 80 });
            }}
            data-testid="tour-look-cone-save"
          >
            {cone ? "Update: forward is where I'm looking" : "Set: forward is where I'm looking"}
          </button>
        </div>
      )}
    </section>
  );
}
