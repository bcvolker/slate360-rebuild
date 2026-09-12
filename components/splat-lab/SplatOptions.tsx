"use client";

import { HelpTooltip } from "@/components/splat-lab/HelpTooltip";
import { ramEstimateBytes, ramFitsBudget, resolveSplatCap, resolveSteps, viewPx } from "@/lib/splat-lab/steps";
import type { Knobs } from "@/lib/splat-lab/clones";

const HELP = {
  viewImageSize: "Pixel width of each of the 16 training views per panorama. 1280 is Proven's default (fits in RAM); 1920/Max need more RAM and may not fit a long capture.",
  quality: "Step target: Test=5k, Medium=30k, High=100k, Auto=views x 50 / imagesPerStep (the reference studio's own formula).",
  shDegree: "Spherical harmonics degree (0-3). Higher captures view-dependent reflections. 3 is Proven's default.",
  maxSplatsMillions: "Cap on total splats. 0 = auto (views x 500, GPU-capped). Not enforced by the default trainer — Lab's MCMC trainer enforces it.",
  strategy: "Default = nerfstudio's stock densification (no cap enforced). MCMC = gsplat's MCMC strategy with an enforced splat cap — Lab only, promoted to Proven only after it wins an A/B test.",
  bilateralGrid: "Handles exposure/ISP changes across frames. Off by default; try On for captures with visible brightness flicker.",
};

export function SplatOptions({
  knobs,
  setKnobs,
  viewCount,
  isLab,
}: {
  knobs: Knobs;
  setKnobs: (k: Knobs) => void;
  viewCount: number;
  isLab: boolean;
}) {
  const set = (patch: Partial<Knobs>) => setKnobs({ ...knobs, ...patch });
  const w = viewPx(knobs.viewImageSize);
  const ramBytes = ramEstimateBytes(viewCount || 13040, w);
  const ramGb = (ramBytes / 1024 ** 3).toFixed(1);
  const fits = ramFitsBudget(viewCount || 13040, w);
  const resolvedSteps = resolveSteps(knobs.quality, knobs.trainingSteps, viewCount || 13040, knobs.imagesPerStep);
  const resolvedCap = resolveSplatCap(knobs.maxSplatsMillions, viewCount || 13040);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div>
        <Label text="Image size" help={HELP.viewImageSize} />
        <div className="mt-1 flex overflow-hidden rounded-md border border-white/10">
          {(["768", "1024", "1280", "1920", "max"] as const).map((v) => (
            <button key={v} onClick={() => set({ viewImageSize: v })}
              className={`flex-1 px-1.5 py-1.5 font-mono text-[10px] uppercase transition ${knobs.viewImageSize === v ? "bg-[var(--twin360-blue)] text-white" : "bg-[var(--graphite-canvas)] text-[var(--graphite-muted)] hover:text-white"}`}>
              {v}
            </button>
          ))}
        </div>
        <p className={`mt-1 font-mono text-[10px] ${fits ? "text-[var(--graphite-muted)]" : "text-red-400"}`}>
          ~{ramGb} GB RAM {fits ? "" : "— exceeds budget"}
        </p>
      </div>

      <div>
        <Label text="Quality" help={HELP.quality} />
        <div className="mt-1 flex overflow-hidden rounded-md border border-white/10">
          {(["test", "medium", "high", "auto"] as const).map((v) => (
            <button key={v} onClick={() => set({ quality: v })}
              className={`flex-1 px-1.5 py-1.5 font-mono text-[10px] uppercase transition ${knobs.quality === v ? "bg-[var(--twin360-blue)] text-white" : "bg-[var(--graphite-canvas)] text-[var(--graphite-muted)] hover:text-white"}`}>
              {v}
            </button>
          ))}
        </div>
        <p className="mt-1 font-mono text-[10px] text-[var(--graphite-muted)]">{resolvedSteps.toLocaleString()} steps</p>
      </div>

      <div>
        <Label text="SH degree" help={HELP.shDegree} />
        <input type="number" min={0} max={3} value={knobs.shDegree} onChange={(e) => set({ shDegree: Number(e.target.value) })}
          className="mt-1 w-full rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-2 py-1.5 font-mono text-xs text-[var(--graphite-text-body)] focus:border-[var(--twin360-blue)] focus:outline-none" />
      </div>

      <div>
        <Label text="Splat limit (M)" help={HELP.maxSplatsMillions} />
        <input type="number" min={0} step={0.5} value={knobs.maxSplatsMillions} onChange={(e) => set({ maxSplatsMillions: Number(e.target.value) })}
          className="mt-1 w-full rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-2 py-1.5 font-mono text-xs text-[var(--graphite-text-body)] focus:border-[var(--twin360-blue)] focus:outline-none" />
        <p className="mt-1 font-mono text-[10px] text-[var(--graphite-muted)]">
          {resolvedCap.toLocaleString()} cap {knobs.strategy === "default" ? "(not enforced)" : "(enforced)"}
        </p>
      </div>

      {isLab ? (
        <div>
          <Label text="Strategy" help={HELP.strategy} />
          <div className="mt-1 flex overflow-hidden rounded-md border border-white/10">
            {(["default", "mcmc"] as const).map((v) => (
              <button key={v} onClick={() => set({ strategy: v })}
                className={`flex-1 px-1.5 py-1.5 font-mono text-[10px] uppercase transition ${knobs.strategy === v ? "bg-[var(--twin360-blue)] text-white" : "bg-[var(--graphite-canvas)] text-[var(--graphite-muted)] hover:text-white"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* A <button> cannot contain another <button> (HelpTooltip's own
          trigger) without breaking hydration — see InputCard.tsx's Toggle
          for the same fix. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => set({ useBilateralGrid: !knobs.useBilateralGrid })}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set({ useBilateralGrid: !knobs.useBilateralGrid }); } }}
        className="flex cursor-pointer items-center justify-between gap-2 self-end rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-3 py-2 text-xs text-[var(--graphite-text-body)] transition hover:border-[color-mix(in_srgb,var(--twin360-blue)_40%,transparent)]"
      >
        <span className="flex items-center gap-1">
          Bilateral grid
          <span onClick={(e) => e.stopPropagation()}><HelpTooltip text={HELP.bilateralGrid} /></span>
        </span>
        <span className={`size-2 rounded-full ${knobs.useBilateralGrid ? "bg-[var(--twin360-blue)]" : "bg-zinc-600"}`} />
      </div>
    </div>
  );
}

function Label({ text, help }: { text: string; help: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{text}</span>
      <HelpTooltip text={help} />
    </div>
  );
}
