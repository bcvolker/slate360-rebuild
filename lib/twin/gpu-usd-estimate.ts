/**
 * Conservative Modal GPU dollar estimates for Twin jobs.
 *
 * Credits already gate customer billing. This is the *our* cost — A10G time on
 * Modal — so a research run is never dispatched without a number Brian can
 * approve. Rates are padded: first-image builds, failed trains, and queue
 * spin all still bill.
 *
 * Production twin worker GPU: A10G (`workers/modal/twin-gaussian-splat/worker.py`).
 * Modal list price used here: $1.10/hr (2026). Buffer 1.4× for setup/teardown.
 */

export const MODAL_A10G_USD_PER_HOUR = 1.1;
export const GPU_COST_BUFFER = 1.4;

export type TwinGpuJobKind =
  | "viewer_only"
  | "splatfacto_standard"
  | "odgs_authors_sample"
  | "odgs_image_build"
  | "odgs_x4_clip"
  | "opensfm_plus_odgs"
  | "dji_layer";

export type TwinGpuUsdEstimate = {
  kind: TwinGpuJobKind;
  gpu: "none" | "A10G";
  minutesLow: number;
  minutesHigh: number;
  usdLow: number;
  usdHigh: number;
  note: string;
};

function usdFromMinutes(minutes: number): number {
  const hours = minutes / 60;
  return Math.round(hours * MODAL_A10G_USD_PER_HOUR * GPU_COST_BUFFER * 100) / 100;
}

const STATIC: Record<TwinGpuJobKind, Omit<TwinGpuUsdEstimate, "kind">> = {
  viewer_only: {
    gpu: "none",
    minutesLow: 0,
    minutesHigh: 0,
    usdLow: 0,
    usdHigh: 0,
    note: "Stored mesh/splat in the browser. No Modal call.",
  },
  splatfacto_standard: {
    gpu: "A10G",
    minutesLow: 12,
    minutesHigh: 35,
    usdLow: usdFromMinutes(12),
    usdHigh: usdFromMinutes(35),
    note: "Kitchen-scale splatfacto on A10G. Interior COLMAP retries are how this becomes a wasted bill.",
  },
  odgs_authors_sample: {
    gpu: "A10G",
    minutesLow: 8,
    minutesHigh: 20,
    usdLow: usdFromMinutes(8),
    usdHigh: usdFromMinutes(20),
    note: "Authors' sample after the image exists. Do this before any X4 file.",
  },
  odgs_image_build: {
    gpu: "A10G",
    minutesLow: 15,
    minutesHigh: 45,
    usdLow: 1.5,
    usdHigh: 8,
    note: "First Modal image bake (CUDA + ODGS). Mostly CPU/build time; still a real bill. Once.",
  },
  odgs_x4_clip: {
    gpu: "A10G",
    minutesLow: 20,
    minutesHigh: 60,
    usdLow: usdFromMinutes(20),
    usdHigh: usdFromMinutes(60),
    note: "One kitchen/AOB X4 clip, only after the authors' sample succeeds.",
  },
  opensfm_plus_odgs: {
    gpu: "A10G",
    minutesLow: 25,
    minutesHigh: 75,
    usdLow: usdFromMinutes(25),
    usdHigh: usdFromMinutes(75),
    note: "Plan D — only if the ODGS sample path fails a quality gate.",
  },
  dji_layer: {
    gpu: "A10G",
    minutesLow: 20,
    minutesHigh: 55,
    usdLow: usdFromMinutes(20),
    usdHigh: usdFromMinutes(55),
    note: "Separate splat layer, registered to the LiDAR world. Not a second try of the same clip.",
  },
};

export function estimateTwinGpuUsd(kind: TwinGpuJobKind): TwinGpuUsdEstimate {
  return { kind, ...STATIC[kind] };
}

export function formatTwinGpuUsd(estimate: TwinGpuUsdEstimate): string {
  if (estimate.usdHigh <= 0) return "$0";
  if (estimate.usdLow === estimate.usdHigh) return `~$${estimate.usdLow.toFixed(2)}`;
  return `~$${estimate.usdLow.toFixed(2)}–$${estimate.usdHigh.toFixed(2)}`;
}
