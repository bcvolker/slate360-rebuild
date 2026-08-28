import { useState } from "react";
import { SplatCanvas, captureCanvasPng, type ViewMode } from "../components/SplatCanvas";
import { api } from "../api";

export function ViewScreen({
  splatUrl,
  trajectoryUrl,
  trajectoryPlotUrl,
}: {
  splatUrl: string | null;
  trajectoryUrl?: string | null;
  trajectoryPlotUrl?: string | null;
}) {
  const [mode, setMode] = useState<ViewMode>("orbit");
  const [stats, setStats] = useState<{ count: number; size: number[] } | null>(null);

  const diag = stats && stats.size.length === 3 ? Math.hypot(...stats.size) : null;

  return (
    <div className="page">
      <div className="row">
        {(["orbit", "top", "walk"] as ViewMode[]).map((id) => (
          <button key={id} className={mode === id ? "primary" : ""} onClick={() => setMode(id)}>
            {id}
          </button>
        ))}
        <button
          onClick={async () => {
            const png = captureCanvasPng();
            if (!png) return;
            await api.screenshot(png, mode, `${mode}_${Date.now()}.png`);
          }}
        >
          CAPTURE SCREENSHOT
        </button>
      </div>
      <p className="muted">
        Top view is the collapse check. Dimensions are NOT metric until LiDAR registration.
      </p>
      {!splatUrl && <p className="warn">No reconstruction loaded. Process a run or attach a real model.spz.</p>}
      <SplatCanvas url={splatUrl} trajectoryUrl={trajectoryUrl} mode={mode} onStats={setStats} />
      {trajectoryPlotUrl && (
        <img className="traj-plot" src={trajectoryPlotUrl} alt="Estimated camera trajectory (not metric)" />
      )}
      {stats && (
        <p>
          Gaussians {stats.count.toLocaleString()}
          {diag
            ? ` · Bounds ${stats.size.map((n) => n.toFixed(2)).join(" × ")} · Diagonal ${diag.toFixed(2)} *`
            : " · Spark AABB unavailable (use PLY bbox; not metric)"}
        </p>
      )}
    </div>
  );
}
