import type { SiteWalkPlanSet } from "@/lib/types/site-walk";

export type CaptureV2MobileFork = "choice" | "plan" | "camera";

export function captureV2ForkStorageKey(sessionId: string): string {
  return `site-walk:capture-v2-fork:${sessionId}`;
}

export function hasReadyPlanSet(planSets: SiteWalkPlanSet[]): boolean {
  return planSets.some((set) => set.processing_status === "ready");
}

export function readStoredCaptureV2Fork(sessionId: string): "plan" | "camera" | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(captureV2ForkStorageKey(sessionId));
  return value === "plan" || value === "camera" ? value : null;
}

export function persistCaptureV2Fork(sessionId: string, mode: "plan" | "camera"): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(captureV2ForkStorageKey(sessionId), mode);
}
