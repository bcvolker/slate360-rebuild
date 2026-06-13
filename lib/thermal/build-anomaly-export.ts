import "server-only";

type AnomalyRow = {
  id?: string;
  type?: string;
  severity?: string;
  delta_c?: number;
  bbox?: { x?: number; y?: number; w?: number; h?: number };
  user_mark?: string;
};

export type AnomalyExportCapture = {
  id: string;
  filename: string | null;
  anomalies: unknown[];
  gpsPosition?: Record<string, unknown>;
};

function rowsFromCapture(capture: AnomalyExportCapture): AnomalyRow[] {
  return (capture.anomalies as AnomalyRow[]) ?? [];
}

export function buildAnomalyCsv(captures: AnomalyExportCapture[]): string {
  const lines = ["capture,anomaly_id,type,severity,delta_c,bbox,user_mark"];
  for (const capture of captures) {
    for (const row of rowsFromCapture(capture)) {
      const bbox = row.bbox;
      lines.push(
        [
          capture.filename || capture.id,
          row.id ?? "",
          row.type ?? "",
          row.severity ?? "",
          row.delta_c ?? "",
          bbox ? `${bbox.x ?? 0},${bbox.y ?? 0},${bbox.w ?? 0},${bbox.h ?? 0}` : "",
          row.user_mark ?? "",
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(","),
      );
    }
  }
  return lines.join("\n");
}

export function buildAnomalyJson(sessionName: string, captures: AnomalyExportCapture[]) {
  return {
    session: sessionName,
    exported_at: new Date().toISOString(),
    captures: captures.map((capture) => ({
      id: capture.id,
      filename: capture.filename,
      anomalies: capture.anomalies,
    })),
  };
}

export function buildAnomalyGeoJson(captures: AnomalyExportCapture[]) {
  const features: Array<Record<string, unknown>> = [];
  for (const capture of captures) {
    const gps = capture.gpsPosition ?? {};
    const lat = typeof gps.lat === "number" ? gps.lat : typeof gps.latitude === "number" ? gps.latitude : null;
    const lon =
      typeof gps.lon === "number" ? gps.lon : typeof gps.longitude === "number" ? gps.longitude : null;
    if (lat == null || lon == null) continue;

    for (const row of rowsFromCapture(capture)) {
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
          capture_id: capture.id,
          capture_filename: capture.filename,
          anomaly_id: row.id ?? null,
          type: row.type ?? null,
          severity: row.severity ?? null,
          delta_c: row.delta_c ?? null,
          user_mark: row.user_mark ?? null,
        },
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
