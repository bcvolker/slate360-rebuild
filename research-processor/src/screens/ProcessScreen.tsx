import { DropZone } from "../components/DropZone";
import type { CaptureType, EnvStatus, JobEvent, Quality } from "../types";

const STAGES = [
  "preparing",
  "extracting",
  "dataset",
  "tracking",
  "mapping",
  "exporting_ply",
  "creating_spz",
  "validating",
];

export function ProcessScreen({
  projectName,
  setProjectName,
  captureType,
  setCaptureType,
  quality,
  setQuality,
  fileLabel,
  inputPath,
  setInputPath,
  onFile,
  env,
  running,
  last,
  onProcess,
  onCancel,
}: {
  projectName: string;
  setProjectName: (v: string) => void;
  captureType: CaptureType;
  setCaptureType: (v: CaptureType) => void;
  quality: Quality;
  setQuality: (v: Quality) => void;
  fileLabel: string;
  inputPath: string;
  setInputPath: (v: string) => void;
  onFile: (path: string, name: string) => void;
  env: EnvStatus | null;
  running: boolean;
  last: JobEvent | null;
  onProcess: () => void;
  onCancel: () => void;
}) {
  const progress = last?.progress ?? 0;
  return (
    <div className="page">
      <p className="badge">ODGS-SLAM — RESEARCH ONLY · non-commercial academic use</p>
      <label>PROJECT</label>
      <input value={projectName} onChange={(e) => setProjectName(e.target.value)} />
      <DropZone onFile={onFile} />
      {fileLabel && <p>{fileLabel}</p>}
      <label>FULL PATH (browsers hide this — paste if empty)</label>
      <input value={inputPath} onChange={(e) => setInputPath(e.target.value)} placeholder="D:\\...\\VID_120.mp4" />

      <label>CAPTURE TYPE</label>
      <div className="radio">
        {(["unknown", "high", "low", "normal"] as CaptureType[]).map((id) => (
          <label key={id}>
            <input type="radio" checked={captureType === id} onChange={() => setCaptureType(id)} /> {id}
          </label>
        ))}
      </div>

      <label>QUALITY</label>
      <div className="radio">
        {(["preview", "standard", "research-high"] as Quality[]).map((id) => (
          <label key={id}>
            <input type="radio" checked={quality === id} onChange={() => setQuality(id)} /> {id}
          </label>
        ))}
      </div>
      {quality === "research-high" && (
        <p className="warn">Research High may exceed 24 GB VRAM on 8K X4. Prefer Preview for the first run.</p>
      )}

      <p>
        GPU {env?.gpu.detail || "—"} · {env?.mockMode ? "MOCK MODE (no WSL/ODGS on this PC)" : "ENGINE READY"}
      </p>

      <div className="row">
        <button className="primary" disabled={running || !inputPath} onClick={onProcess}>
          PROCESS
        </button>
        <button disabled={!running} onClick={onCancel}>
          CANCEL
        </button>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        {STAGES.map((s) => (
          <div key={s} className="check">
            <span>{s.replaceAll("_", " ")}</span>
            <span>{last?.stage === s ? `${Math.round(progress * 100)}%` : last && STAGES.indexOf(last.stage) > STAGES.indexOf(s) ? "done" : "—"}</span>
          </div>
        ))}
        {last?.frame != null && (
          <p className="muted">
            Frame {last.frame} / {last.total ?? "?"}
          </p>
        )}
      </div>
    </div>
  );
}
