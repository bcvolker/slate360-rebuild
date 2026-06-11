"use client";

type Props = {
  chromeVisible: boolean;
  recording: boolean;
  recSeconds: number;
  clipCount: number;
  completedClipCount: number;
  cameraStreaming: boolean;
  needsResume: boolean;
  cameraError: string | null;
  recorderRecording: boolean;
  recorderError: string | null;
  sensorPermission: string;
  levelLineActive: boolean;
  lastOrientationEventAt: number | null;
  guideState: string | null;
  paceVariance: number;
  stabilityVariance: number;
  ghostFrameCaptured: boolean;
  ghostFrameByteSize: number;
  ghostMounted: boolean;
  lastFrameCaptureAt: number | null;
  lastShutterTapAt: number | null;
};

function fmtTs(ts: number | null): string {
  if (ts === null) return "—";
  return new Date(ts).toISOString().slice(11, 23);
}

function sensorLevelLineNote(permission: string, levelLineActive: boolean): string {
  if (permission === "denied") return "hidden (sensors denied)";
  if (permission === "unavailable") return "hidden (unavailable)";
  if (permission === "unknown") return "hidden (awaiting permission)";
  return levelLineActive ? "active" : "hidden (no grant yet)";
}

export function TwinCaptureDebugOverlay({
  chromeVisible,
  recording,
  recSeconds,
  clipCount,
  completedClipCount,
  cameraStreaming,
  needsResume,
  cameraError,
  recorderRecording,
  recorderError,
  sensorPermission,
  levelLineActive,
  lastOrientationEventAt,
  guideState,
  paceVariance,
  stabilityVariance,
  ghostFrameCaptured,
  ghostFrameByteSize,
  ghostMounted,
  lastFrameCaptureAt,
  lastShutterTapAt,
}: Props) {
  const rows: [string, string][] = [
    ["chromeVisible", String(chromeVisible)],
    ["recording", String(recording)],
    ["recSeconds", String(recSeconds)],
    ["clips", String(clipCount)],
    ["completedClips", String(completedClipCount)],
    ["camera.isStreaming", String(cameraStreaming)],
    ["needsResume", String(needsResume)],
    ["camera.error", cameraError ?? "—"],
    ["recorder.recording", String(recorderRecording)],
    ["recorder.error", recorderError ?? "—"],
    ["sensor.permission", sensorPermission],
    ["levelLine", sensorLevelLineNote(sensorPermission, levelLineActive)],
    ["lastOrientationEvent", fmtTs(lastOrientationEventAt)],
    ["guide.state", guideState ?? "—"],
    ["guide.paceVariance", paceVariance.toFixed(3)],
    ["guide.stabilityVariance", stabilityVariance.toFixed(1)],
    ["ghostFrameCaptured", String(ghostFrameCaptured)],
    ["ghostFrameByteSize", String(ghostFrameByteSize)],
    ["ghostMounted", String(ghostMounted)],
    ["lastFrameCapture", fmtTs(lastFrameCaptureAt)],
    ["lastShutterTap", fmtTs(lastShutterTapAt)],
  ];

  return (
    <div
      className="pointer-events-none fixed bottom-2 left-2 z-[9999] max-w-[min(92vw,280px)] rounded border border-white/20 bg-black/80 px-2 py-1.5 font-mono text-[10px] leading-tight text-emerald-300"
      data-twin-capture-debug
      aria-hidden
    >
      {rows.map(([key, value]) => (
        <div key={key} className="truncate">
          <span className="text-zinc-400">{key}=</span>
          {value}
        </div>
      ))}
    </div>
  );
}
