/**
 * Pure psychrometric helpers for the S5.6 dew-point alarm. No dependencies —
 * unit-test-friendly.
 */

/** Magnus-formula dew point (°C) from air temperature (°C) and relative humidity (0-100). */
export function dewPointC(airTempC: number, rhPct: number): number {
  const a = 17.62;
  const b = 243.12;
  const rh = Math.max(0.1, Math.min(100, rhPct)) / 100;
  const gamma = (a * airTempC) / (b + airTempC) + Math.log(rh);
  return (b * gamma) / (a - gamma);
}

/**
 * Insulation-alarm threshold (°C): the surface temperature below which a
 * pixel is flagged as under-insulated, given indoor/outdoor air temps and a
 * 0-1 "factor" (thermographic-index-style threshold — 1 = as warm as
 * indoor air, 0 = as cold as outdoor air).
 */
export function insulationThresholdC(indoorC: number, outdoorC: number, factor: number): number {
  return outdoorC + Math.max(0, Math.min(1, factor)) * (indoorC - outdoorC);
}
