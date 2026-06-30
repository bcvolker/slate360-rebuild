/**
 * Twin 360 capture HUD — SHARED CONTRACT (single source of truth).
 *
 * The capture HUD is forked by necessity (React over getUserMedia on web/non-LiDAR/
 * Android; native SwiftUI over ARKit on LiDAR iPhones — see
 * docs/design/TWIN_CAPTURE_HUD_PARITY.md). To stop the two renderers DRIFTING, both
 * implement THIS contract: same state, same capabilities, same actions, same labels.
 * Adding a field here forces both renderers to handle it. Pixel/layout values live in
 * `TWIN_CAPTURE_CHROME` (twin-capture-chrome-layout.ts) and the design tokens; this file
 * is the behavioral/state contract. The Swift side mirrors these as a Decodable struct.
 *
 * Multi-AI panel (Jun 29) consensus: native HUD parity now, driven by this shared spec;
 * NOT a WebView-over-ARKit overlay (thermal/latency). Embedded-native-preview + one React
 * HUD is the later "kill the fork" end-state (Option 3).
 */

export type TwinCaptureMode = "photos" | "video";
export type TwinTorchState = "off" | "on";
export type TwinTrackingState = "initializing" | "normal" | "limited" | "relocalizing" | "unavailable";
export type TwinThermalState = "nominal" | "fair" | "serious" | "critical";

/**
 * Which controls a given capture backend can actually drive. The HUD renders a control
 * in a DISABLED/"best-effort" state when its capability is false (identical in both
 * renderers), rather than hiding it — so the layout is stable across devices.
 */
export type TwinHudCapability = {
  /** Photo/video toggle. true everywhere. */
  modeToggle: boolean;
  /** Hardware torch. true on LiDAR ARKit (wide-camera device) AND web getUserMedia. */
  torch: boolean;
  /**
   * Exposure / AE lock. true on the web getUserMedia path (AVCaptureSession exposes the
   * device). **false on the LiDAR ARKit path** — ARKit owns the AVCaptureDevice and
   * fighting it for exposure can break VIO tracking (multi-AI panel caveat). The pill
   * renders disabled with an "Auto (LiDAR)" hint when false.
   */
  exposureLock: boolean;
  /** Ghost overlap overlay (prior clip's last keyframe). */
  ghostOverlay: boolean;
  /** Coverage/level guide. */
  coverageGuide: boolean;
  /** LiDAR point-count + tracking chips — additive, true only when depth is present. */
  lidarChip: boolean;
};

/** Everything the HUD renders. The capture engine owns this; the HUD is presentational. */
export type TwinHudState = {
  mode: TwinCaptureMode;
  torch: TwinTorchState;
  recording: boolean;
  /** Elapsed recording time (video) or capture burst (photos), ms. */
  elapsedMs: number;
  /** Remaining time before the soft clip cap auto-rolls, or null when no cap is active. */
  remainingClipMs: number | null;
  tracking: TwinTrackingState;
  thermal: TwinThermalState;
  /** 0-based index of the current clip/segment within the twin. */
  segmentIndex: number;
  /** Captured photo frames so far (photos mode). */
  photoFrameCount: number;
  /** LiDAR points accumulated (0 / omitted on RGB-only devices). */
  lidarPointCount: number;
  /** AE locked right now (only meaningful when capability.exposureLock). */
  exposureLocked: boolean;
  /** Uploads still pending (review chrome). */
  pendingSegments: number;
  /** Coverage progress 0..1 for the guide ring. */
  coverageProgress: number;
  capability: TwinHudCapability;
};

/** Commands the HUD emits. The engine (React hook or Swift VC) implements them. */
export type TwinHudActions = {
  onModeChange: (mode: TwinCaptureMode) => void;
  onTorchToggle: (next: TwinTorchState) => void;
  /** Photos: capture a frame. Video: start/stop is onStartClip/onEndClip. */
  onShutter: () => void;
  onStartClip: () => void;
  onEndClip: () => void;
  /** No-op when capability.exposureLock is false (pill renders disabled). */
  onExposureLockToggle: () => void;
  onBack: () => void;
  onToggleChrome: () => void;
  onDone: () => void;
};

/** Canonical labels — identical strings in both renderers (panel: share strings, not code). */
export const TWIN_HUD_LABELS = {
  light: "Light",
  exposure: "Exposure",
  exposureUnavailable: "Auto (LiDAR)",
  modeVideo: "Video",
  modePhotos: "Photos",
  trackingLimited: "Move slower",
  trackingRelocalizing: "Re-finding position…",
  recording: "REC",
  capturing: "CAPTURING",
  ready: "READY",
} as const;

/** Capability presets per backend — the ONE place each device class's controls are decided. */
export const TWIN_HUD_CAPABILITY_LIDAR_ARKIT: TwinHudCapability = {
  modeToggle: true,
  torch: true,
  exposureLock: false, // ARKit owns the camera — see field doc
  ghostOverlay: true,
  coverageGuide: true,
  lidarChip: true,
};

export const TWIN_HUD_CAPABILITY_RGB_WEB: TwinHudCapability = {
  modeToggle: true,
  torch: true,
  exposureLock: true, // getUserMedia / AVCaptureSession exposes the device
  ghostOverlay: true,
  coverageGuide: true,
  lidarChip: false, // no depth on RGB-only devices
};
