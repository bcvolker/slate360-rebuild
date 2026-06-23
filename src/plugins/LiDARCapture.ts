import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

export interface LiDARStartOptions {
  confidence?: "low" | "medium" | "high";
}

export interface LiDARStopResult {
  pointCount: number;
  keyframeCount: number;
}

export interface LiDARExportResult {
  plyUri: string;
  posesUri: string;
  pointCount: number;
}

export interface LiDARProgressEvent {
  pointCount: number;
}

export interface LiDARCapturePlugin {
  isAvailable(): Promise<{ available: boolean }>;
  startSession(options?: LiDARStartOptions): Promise<void>;
  stopSession(): Promise<LiDARStopResult>;
  exportData(): Promise<LiDARExportResult>;
  cleanup(): Promise<void>;
  addListener(
    eventName: "progress",
    listenerFunc: (data: LiDARProgressEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export const LiDARCapture = registerPlugin<LiDARCapturePlugin>("LiDARCapture");

/** Returns true only on a physical LiDAR-capable iOS device (iPhone 12 Pro+).
 *  Always false on web, simulators, and non-LiDAR iPhones. */
export async function isLiDARAvailable(): Promise<boolean> {
  try {
    const result = await LiDARCapture.isAvailable();
    return result.available;
  } catch {
    return false;
  }
}
