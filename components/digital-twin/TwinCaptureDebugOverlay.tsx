"use client";

type Props = {
  chromeVisible: boolean;
  recording: boolean;
  recSeconds: number;
  cameraStreaming: boolean;
  needsResume: boolean;
  cameraError: string | null;
  recorderRecording: boolean;
  recorderError: string | null;
  sensorPermission: string;
  lastShutterTapAt: number | null;
};

function fmtTs(ts: number | null): string {
  if (ts === null) return "—";
  return new Date(ts).toISOString().slice(11, 23);
}

export function TwinCaptureDebugOverlay({
  chromeVisible,
  recording,
  recSeconds,
  cameraStreaming,
  needsResume,
  cameraError,
  recorderRecording,
  recorderError,
  sensorPermission,
  lastShutterTapAt,
}: Props) {
  const rows: [string, string][] = [
    ["chromeVisible", String(chromeVisible)],
    ["recording", String(recording)],
    ["recSeconds", String(recSeconds)],
    ["camera.isStreaming", String(cameraStreaming)],
    ["needsResume", String(needsResume)],
    ["camera.error", cameraError ?? "—"],
    ["recorder.recording", String(recorderRecording)],
    ["recorder.error", recorderError ?? "—"],
    ["sensor.permission", sensorPermission],
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
