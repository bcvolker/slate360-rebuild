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

/** Manifest returned by the native-led capture (presentCapture).
 *  In the native-upload path (V2) the plugin uploads the capture files directly to
 *  storage and resolves with `captureId` + `uploaded:true` — the `*Uri` fields are
 *  null because the files never cross into the JS heap (that crossing crashed the
 *  WKWebView content process → "Load failed"). `uploadError` is set when native
 *  upload fails so the web layer can show a friendly message instead of throwing. */
export interface TwinCaptureManifest {
  cancelled: boolean;
  captureId?: string;
  uploaded?: boolean;
  uploadError?: string;
  errorCode?: string;
  videoUri?: string | null;
  plyUri?: string | null;
  posesUri?: string | null;
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
  /** Twin space + project the capture uploads to (required for native upload). */
  spaceId?: string;
  projectId?: string;
  /** Optional capture title. */
  title?: string;
  /** Origin the native uploader posts to (defaults to https://www.slate360.ai). Pass
   *  `window.location.origin` so preview/staging builds hit the same host as the webview. */
  apiBase?: string;
}

/** Emitted by the native plugin when it transitions from capture into uploading the
 *  files, so the web launcher can swap its spinner copy from "capturing" to "uploading"
 *  while `presentCapture` is still awaiting (native resolves only after upload finishes). */
export interface LiDARUploadPhaseEvent {
  phase: "uploading";
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
  addListener(
    eventName: "uploadPhase",
    listenerFunc: (data: LiDARUploadPhaseEvent) => void,
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
