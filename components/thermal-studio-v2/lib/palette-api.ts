import { patchCaptureWithStatus } from "@/components/thermal-studio-v2/lib/save-status";

/** Autosave for the active image's palette (W1: persist + seed). */
export function savePalette(captureId: string, palette: string): void {
  void patchCaptureWithStatus(captureId, { palette });
}

/**
 * Audit remediation Batch 3: persist a customized display span the same way
 * palette/rotation already do, so Export can render "what you actually see"
 * instead of always the tuned grid's full natural range.
 */
export function saveDisplaySpan(captureId: string, span: { lo: number; hi: number }): void {
  void patchCaptureWithStatus(captureId, { display_span: span });
}
