import type { OperatorPatch } from "./types";
import { DEFAULT_OPERATOR_PATCH } from "./types";

export function parseOperatorPatch(raw: unknown): OperatorPatch {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_OPERATOR_PATCH };
  const o = raw as Record<string, unknown>;
  return {
    enabled: o.enabled !== false,
    nadirFrac: clamp01(num(o.nadirFrac, DEFAULT_OPERATOR_PATCH.nadirFrac), 0.05, 0.45),
    wrapFrac: clamp01(num(o.wrapFrac, DEFAULT_OPERATOR_PATCH.wrapFrac), 0, 0.25),
    wrapY0Frac: clamp01(num(o.wrapY0Frac, DEFAULT_OPERATOR_PATCH.wrapY0Frac), 0, 0.8),
    logoInPatch: o.logoInPatch !== false,
    showDate: o.showDate !== false,
  };
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clamp01(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** ERP mask: 0 = covered (operator), 1 = keep. Width/height of a small canvas. */
export function buildOperatorMask(width: number, height: number, patch: OperatorPatch): Uint8Array {
  const m = new Uint8Array(width * height);
  m.fill(255);
  if (!patch.enabled) return m;
  const y0 = Math.floor(height * (1 - patch.nadirFrac));
  for (let y = y0; y < height; y++) {
    m.fill(0, y * width, (y + 1) * width);
  }
  const xw = Math.floor(width * patch.wrapFrac);
  const yw = Math.floor(height * patch.wrapY0Frac);
  for (let y = yw; y < height; y++) {
    const row = y * width;
    m.fill(0, row, row + xw);
    m.fill(0, row + width - xw, row + width);
  }
  return m;
}
