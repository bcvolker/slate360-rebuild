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

/** Turns raw backend/DB error text into something a thermographer can act on. */
function friendlyGridError(status: number, rawMessage: string | undefined): string {
  if (status === 401) return "Sign in to load this image's temperature data.";
  if (status === 415) return rawMessage ?? "This image hasn't been decoded yet — run Decode temperatures first.";
  if (status === 404) return "This image couldn't be found — it may have been deleted.";
  if (!rawMessage || /invalid input syntax|constraint|relation|column/i.test(rawMessage)) {
    return "This image's temperature data couldn't be loaded right now.";
  }
  return rawMessage;
}

export async function fetchThermalGrid(captureId: string): Promise<GridFetchResult> {
  try {
    const res = await fetch(`/api/ops/thermal/captures/${captureId}/grid`);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { error: friendlyGridError(res.status, body?.error as string | undefined) };
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
