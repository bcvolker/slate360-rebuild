import type { EnvStatus } from "../types";

const ROWS: { key: keyof EnvStatus; label: string }[] = [
  { key: "gpu", label: "RTX GPU" },
  { key: "driver", label: "NVIDIA Driver" },
  { key: "wsl2", label: "WSL2" },
  { key: "ubuntu", label: "Ubuntu 22.04" },
  { key: "cudaWsl", label: "CUDA in WSL" },
  { key: "ffmpeg", label: "FFmpeg" },
  { key: "odgs", label: "ODGS-SLAM" },
  { key: "spz", label: "SPZ converter" },
];

export function EnvironmentScreen({ env, onRefresh }: { env: EnvStatus | null; onRefresh: () => void }) {
  return (
    <div className="page">
      <p>Checks are read-only on this PC. Nothing is installed silently.</p>
      {ROWS.map((row) => {
        const check = env?.[row.key];
        if (!check || typeof check === "boolean" || typeof check === "string") return null;
        return (
          <div className="check" key={row.key}>
            <span>{row.label}</span>
            <span className={check.status === "READY" ? "ready" : "missing"}>
              {check.status} — {check.detail}
            </span>
          </div>
        );
      })}
      <p className="muted">Host {env?.host} · output {env?.suggestedOutputRoot}</p>
      {env?.wsl2.status !== "READY" && (
        <div className="panel warn">
          <p>WSL2 is required for ODGS-SLAM. Installing it needs Administrator permission and may reboot Windows.</p>
          <p>On the RTX 3090 desktop, run in an elevated PowerShell:</p>
          <pre className="log">wsl --install -d Ubuntu-22.04</pre>
        </div>
      )}
      <button onClick={onRefresh}>RECHECK</button>
    </div>
  );
}
