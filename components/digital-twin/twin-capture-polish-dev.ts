/** Dev-only fixtures for twin capture polish harness. */

export const DEV_TWIN_GHOST_FRAME_URL = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><rect width="480" height="640" fill="#1e293b"/><line x1="0" y1="320" x2="480" y2="300" stroke="#38bdf8" stroke-width="2" opacity="0.5"/><text x="50%" y="50%" text-anchor="middle" fill="#94a3b8" font-family="system-ui" font-size="20">Last clip frame</text></svg>`,
)}`;

export const DEV_TWIN_COVERAGE_PRESETS = [0, 50, 100] as const;
export const DEV_TWIN_ROLL_PRESETS = [0, 5, 12] as const;

export function parseDevCoveragePreset(value: string | null): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  if (parsed === 0) return 0;
  if (parsed === 50) return 0.5;
  if (parsed === 100) return 1;
  return null;
}

export function parseDevRollPreset(value: string | null): number | null {
  const parsed = Number.parseInt(value ?? "", 10);
  return DEV_TWIN_ROLL_PRESETS.includes(parsed as (typeof DEV_TWIN_ROLL_PRESETS)[number])
    ? parsed
    : null;
}

export function parseDevMotionPreset(value: string | null): number | null {
  if (value === "slow") return 72;
  if (value === "good") return 12;
  return null;
}
