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

/** Manifest returned by the native-led capture (presentCapture). */
export interface TwinCaptureManifest {
  cancelled: boolean;
  videoUri?: string | null;
  plyUri?: string;
  posesUri?: string;
  pointCount?: number;
  keyframeCount?: number;
  durationSec?: number;
  sessionStartUnix?: number;
  width?: number;
  height?: number;
}

export interface TwinCapturePresentOptions {
  confidence?: "low" | "medium" | "high";
  maxDurationSec?: number;
  maxPoints?: number;
}

export interface LiDARCapturePlugin {
  isAvailable(): Promise<{ available: boolean; nativeCapture?: boolean }>;
  /**
   * Native-led Twin capture: presents a full-screen ARKit capture screen that owns the camera
   * and records video + LiDAR depth + poses in one pass. Resolves with the capture manifest
   * (or { cancelled: true }). This is the path used on LiDAR iPhones — it replaces the legacy
   * startSession/stopSession/exportData model (kept below for non-native fallbacks).
   */
  presentCapture(options?: TwinCapturePresentOptions): Promise<TwinCaptureManifest>;
  dismissCapture(): Promise<void>;
  // Legacy depth-only API (deprecated for the video+depth path).
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

/** True only when the INSTALLED native build supports the native-led presentCapture flow
 *  AND the device has LiDAR. Older installed builds (no `nativeCapture` flag) return false,
 *  so the web getUserMedia path keeps working until the new build is installed. */
export async function isNativeTwinCaptureAvailable(): Promise<boolean> {
  try {
    const result = await LiDARCapture.isAvailable();
    return result.available === true && result.nativeCapture === true;
  } catch {
    return false;
  }
}
