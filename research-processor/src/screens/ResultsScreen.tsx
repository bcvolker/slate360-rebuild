import type { JobEvent } from "../types";
import { api } from "../api";

export function ResultsScreen({ last, runRoot }: { last: JobEvent | null; runRoot: string | null }) {
  const v = last?.validation;
  const err = last?.error;
  return (
    <div className="page">
      <h2>RECONSTRUCTION {v?.verdict || (err ? "FAIL" : "—")}</h2>
      {err && (
        <div className="panel warn">
          <strong>{err.title}</strong>
          <p>{err.advice}</p>
          <details>
            <summary>VIEW TECHNICAL DETAILS</summary>
            <pre className="log">{err.raw}</pre>
          </details>
        </div>
      )}
      <p>Geometry: {v?.verdict || "n/a"} (not metric)</p>
      <p>Output PLY: {last?.ply || "not written (mock or failed)"}</p>
      <p>Web model SPZ: {last?.spz || "—"}</p>
      <ul>
        {v?.flags.map((f) => (
          <li key={f.id}>
            {f.level}: {f.message}
          </li>
        ))}
      </ul>
      <div className="row">
        <button onClick={() => api.openFolder(runRoot || undefined)}>OPEN OUTPUT FOLDER</button>
        <button onClick={() => api.diagnostics()}>EXPORT DIAGNOSTICS</button>
      </div>
      <p className="muted">Diagnostics ZIP omits multi-GB PLY by default.</p>
    </div>
  );
}
