/**
 * Thermal ↔ visual auto-pairing by filename.
 *
 * Drone/handheld thermal cameras emit a thermal frame and a matching visual photo
 * that share a base name and differ only by a role marker:
 *   DJI_0042_T.JPG  ↔ DJI_0042_W.JPG / _V / _Z       (DJI Mavic/Matrice)
 *   IRX_0042.jpg    ↔ DCX_0042.jpg                    (some Autel/FLIR exports)
 *   FLIR0042_IR.jpg ↔ FLIR0042_DC.jpg                 (FLIR)
 *   foo_thermal.jpg ↔ foo_visual.jpg
 *
 * We classify each file as thermal / visual / unknown, group by the base name, and
 * within a group link the thermal capture to its visual sibling (and vice-versa).
 * Pure + deterministic so it's unit-testable and safe to run server-side.
 */

export type PairInput = { id: string; filename: string | null };
/** capture id → the capture id of its paired image (thermal↔visual, bidirectional). */
export type PairAssignment = { captureId: string; visualPairId: string };

type Role = "thermal" | "visual" | "unknown";

// A separator before the marker is REQUIRED so ordinary names that merely end in
// "t"/"v"/"w" (e.g. "report", "basement") aren't misread as thermal/visual.
const THERMAL_RE = /[ _-](ir|t|therm(?:al)?|radiometric)$/;
const VISUAL_RE = /[ _-](dc|v|w|z|rgb|vis(?:ual)?|zoom|wide|color|colour)$/;
// Whole-name prefixes some cameras use (IRX_/DCX_).
const THERMAL_PREFIX_RE = /^(ir|irx|therm)[ _-]/;
const VISUAL_PREFIX_RE = /^(dc|dcx|vis|rgb)[ _-]/;

function stripExt(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, "");
}

/** Returns the base key (shared between a pair) and the detected role. */
export function classify(filename: string): { baseKey: string; role: Role } {
  const stem = stripExt(filename.trim()).toLowerCase();

  // Suffix marker (most common): DJI_0042_T → base "dji_0042", role thermal.
  const tSuffix = stem.match(THERMAL_RE);
  if (tSuffix) return { baseKey: stem.slice(0, stem.length - tSuffix[0].length), role: "thermal" };
  const vSuffix = stem.match(VISUAL_RE);
  if (vSuffix) return { baseKey: stem.slice(0, stem.length - vSuffix[0].length), role: "visual" };

  // Prefix marker: IRX_0042 ↔ DCX_0042 → base "0042".
  const tPrefix = stem.match(THERMAL_PREFIX_RE);
  if (tPrefix) return { baseKey: stem.slice(tPrefix[0].length), role: "thermal" };
  const vPrefix = stem.match(VISUAL_PREFIX_RE);
  if (vPrefix) return { baseKey: stem.slice(vPrefix[0].length), role: "visual" };

  return { baseKey: stem, role: "unknown" };
}

/**
 * Computes bidirectional pair assignments. Only emits a pair when a base group has
 * exactly one thermal and one visual (avoids ambiguous many-to-many guesses).
 */
export function computeVisualPairs(captures: PairInput[]): PairAssignment[] {
  const groups = new Map<string, { thermal: string[]; visual: string[] }>();
  for (const c of captures) {
    if (!c.filename) continue;
    const { baseKey, role } = classify(c.filename);
    if (role === "unknown" || !baseKey) continue;
    const g = groups.get(baseKey) ?? { thermal: [], visual: [] };
    g[role].push(c.id);
    groups.set(baseKey, g);
  }

  const out: PairAssignment[] = [];
  for (const { thermal, visual } of groups.values()) {
    if (thermal.length === 1 && visual.length === 1) {
      out.push({ captureId: thermal[0], visualPairId: visual[0] });
      out.push({ captureId: visual[0], visualPairId: thermal[0] });
    }
  }
  return out;
}
