import { patchCaptureWithStatus } from "@/components/thermal-studio-v2/lib/save-status";

/** Autosave for the active image's palette (W1: persist + seed). */
export function savePalette(captureId: string, palette: string): void {
  void patchCaptureWithStatus(captureId, { palette });
}
