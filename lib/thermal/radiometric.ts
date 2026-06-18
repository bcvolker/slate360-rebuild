/**
 * Client-side emissivity / reflected-temperature correction for live tuning.
 *
 * This is a gray-body Stefan-Boltzmann approximation: radiance ∝ T_kelvin^4. We
 * reconstruct the total radiance the sensor received under the ORIGINAL emissivity
 * assumption, then re-solve object temperature for a NEW emissivity and reflected
 * (apparent) temperature. It ignores atmospheric transmission and wavelength-band
 * Planck terms, so it is a field "what-if" preview — the authoritative recompute is
 * the server-side re-extract. Good enough to see the effect of ε/Trefl instantly.
 */

const KELVIN = 273.15;

function radiance(tC: number): number {
  const k = tC + KELVIN;
  return k * k * k * k;
}

function tempFromRadiance(w: number): number {
  return Math.pow(Math.max(w, 1e-6), 0.25) - KELVIN;
}

/**
 * Re-derive object temperature for a new emissivity / reflected temp.
 * @param t0C   originally-displayed object temperature (°C)
 * @param e0    emissivity used to compute t0C
 * @param e1    new emissivity
 * @param treflC reflected (apparent) ambient temperature (°C)
 */
export function recomputeTemp(t0C: number, e0: number, e1: number, treflC: number): number {
  if (e1 <= 0.01) return t0C;
  const wRefl = radiance(treflC);
  const wMeasured = e0 * radiance(t0C) + (1 - e0) * wRefl;
  const wObject = (wMeasured - (1 - e1) * wRefl) / e1;
  return tempFromRadiance(wObject);
}

export type TunedGrid = {
  temps: number[] | Float64Array;
  minC: number;
  maxC: number;
};

/**
 * Apply an emissivity/reflected correction across a whole grid. Returns the
 * original arrays unchanged when the new emissivity matches the original (no-op).
 */
export function tuneTemps(
  temps: number[] | Float64Array,
  baseMinC: number,
  baseMaxC: number,
  e0: number,
  e1: number,
  treflC: number,
): TunedGrid {
  if (Math.abs(e1 - e0) < 1e-4) {
    return { temps, minC: baseMinC, maxC: baseMaxC };
  }
  const out = new Float64Array(temps.length);
  let mn = Infinity;
  let mx = -Infinity;
  for (let i = 0; i < temps.length; i++) {
    const v = recomputeTemp(temps[i], e0, e1, treflC);
    out[i] = v;
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  if (!Number.isFinite(mn)) {
    return { temps, minC: baseMinC, maxC: baseMaxC };
  }
  return { temps: out, minC: mn, maxC: mx };
}
