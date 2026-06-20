/**
 * GPU cost model for the Design Studio real-time cost meter + budget cap.
 *
 * The ONLY meaningful running cost is the Unreal Pixel Streaming GPU session.
 * Modal asset-gen jobs are billed per-second and are pennies; tracked separately.
 *
 * Rates are editable here in one place. Verify against the provider before relying
 * on them for hard caps — these are approximate (mid-2026).
 */

export type StreamProvider = "aws" | "eagle3d" | "vast" | "mock";

export interface GpuStreamRate {
  provider: StreamProvider;
  instanceType: string;
  /** USD per hour while the instance is actively running. */
  usdPerHour: number;
  label: string;
}

/** Default stream-host options, cheapest-reliable first. */
export const STREAM_RATES: GpuStreamRate[] = [
  { provider: "mock", instanceType: "mock", usdPerHour: 0, label: "Mock (no GPU)" },
  // AWS on-demand — chosen for clean WebRTC/UDP networking (RunPod can't do UDP).
  { provider: "aws", instanceType: "g4dn.xlarge", usdPerHour: 0.526, label: "AWS g4dn.xlarge (T4)" },
  { provider: "aws", instanceType: "g5.xlarge", usdPerHour: 1.006, label: "AWS g5.xlarge (A10G — better UE5)" },
  // Eagle3D — used only for the free 60-min validation trial.
  { provider: "eagle3d", instanceType: "managed", usdPerHour: 6.0, label: "Eagle3D ($0.10/min)" },
  // Vast.ai — cheapest but fragile networking; fallback only.
  { provider: "vast", instanceType: "marketplace", usdPerHour: 0.3, label: "Vast.ai (variable)" },
];

export function getStreamRate(provider: StreamProvider, instanceType: string): GpuStreamRate | undefined {
  return STREAM_RATES.find((r) => r.provider === provider && r.instanceType === instanceType);
}

/** Default hard caps (override per session). Auto-shutdown enforces these. */
export const DEFAULT_BUDGET = {
  perSessionUsd: 2.0,
  perMonthUsd: 25.0,
  idleTimeoutMs: 5 * 60 * 1000, // shut the GPU down after 5 min of no input
  hardSessionMs: 60 * 60 * 1000, // never let one session exceed 60 min
} as const;

/** Live cost of a running session: elapsed seconds × rate. */
export function computeStreamCostUsd(rateUsdPerHour: number, startedAtIso: string, nowMs: number): number {
  const startedMs = new Date(startedAtIso).getTime();
  if (!Number.isFinite(startedMs)) return 0;
  const elapsedHours = Math.max(0, (nowMs - startedMs) / 3_600_000);
  return Number((rateUsdPerHour * elapsedHours).toFixed(4));
}

/** Should the session auto-shutdown now? (budget cap or hard session limit). */
export function shouldAutoShutdown(args: {
  costUsd: number;
  budgetCapUsd: number | null;
  startedAtIso: string | null;
  lastActiveAtIso: string | null;
  nowMs: number;
}): { stop: boolean; reason?: "budget_cap" | "hard_limit" | "idle" } {
  const { costUsd, budgetCapUsd, startedAtIso, lastActiveAtIso, nowMs } = args;
  if (budgetCapUsd != null && costUsd >= budgetCapUsd) return { stop: true, reason: "budget_cap" };
  if (startedAtIso) {
    const elapsed = nowMs - new Date(startedAtIso).getTime();
    if (elapsed >= DEFAULT_BUDGET.hardSessionMs) return { stop: true, reason: "hard_limit" };
  }
  if (lastActiveAtIso) {
    const idle = nowMs - new Date(lastActiveAtIso).getTime();
    if (idle >= DEFAULT_BUDGET.idleTimeoutMs) return { stop: true, reason: "idle" };
  }
  return { stop: false };
}

/** Modal asset-gen rough cost (per-second GPU), for the secondary spend line. */
export const MODAL_GPU_RATES = {
  // USD per second (approx, mid-2026).
  L4: 0.000222,
  A10G: 0.000306,
  L40S: 0.000542,
} as const;

export function computeModalCostUsd(gpu: keyof typeof MODAL_GPU_RATES, seconds: number): number {
  return Number((MODAL_GPU_RATES[gpu] * Math.max(0, seconds)).toFixed(4));
}
