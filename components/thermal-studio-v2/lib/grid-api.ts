/** Fetches the per-pixel temperature grid from the existing (unchanged) backend route. */

export type ThermalV2Grid = {
  width: number;
  height: number;
  /** Row-major Celsius temperatures, length = width*height. */
  temps: number[];
  minC: number;
  maxC: number;
  emissivity: number | null;
};

export type GridFetchResult = { grid: ThermalV2Grid } | { error: string };

export async function fetchThermalGrid(captureId: string): Promise<GridFetchResult> {
  try {
    const res = await fetch(`/api/ops/thermal/captures/${captureId}/grid`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { error: (body?.error as string) ?? `Failed to load grid (${res.status})` };
    }
    const json = await res.json();
    return {
      grid: {
        width: json.width,
        height: json.height,
        temps: json.temps,
        minC: json.minC,
        maxC: json.maxC,
        emissivity: json.emissivity ?? null,
      },
    };
  } catch {
    return { error: "Network error — grid not loaded" };
  }
}
