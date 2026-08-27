import { useState } from "react";
import { SplatCanvas, captureCanvasPng, type ViewMode } from "../components/SplatCanvas";
import { api } from "../api";

export function ViewScreen({ splatUrl }: { splatUrl: string | null }) {
  const [mode, setMode] = useState<ViewMode>("orbit");
  const [stats, setStats] = useState<{ count: number; size: number[] } | null>(null);

  const diag = stats ? Math.hypot(...stats.size) : null;

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
      <SplatCanvas url={splatUrl} mode={mode} onStats={setStats} />
      {stats && (
        <p>
          Gaussians {stats.count.toLocaleString()} · Bounds {stats.size.map((n) => n.toFixed(2)).join(" × ")} ·
          Diagonal {diag?.toFixed(2)} *
        </p>
      )}
    </div>
  );
}
