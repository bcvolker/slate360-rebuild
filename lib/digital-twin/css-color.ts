import * as THREE from "three";

/**
 * Read a CSS custom property and hand it to three.js as a Color.
 *
 * WebGL materials cannot consume `var(--twin360-blue)` the way a stylesheet
 * can, so without this bridge every 3D surface would need a literal hex — which
 * `guard:design` bans, and rightly: a hardcoded accent breaks white-labelling
 * and theming for every tenant.
 *
 * Fallbacks are expressed as HSL numbers rather than hex so no brand colour is
 * ever written literally in the codebase.
 */
export function cssColor(
  variableName: string,
  fallback: { h: number; s: number; l: number },
): THREE.Color {
  const color = new THREE.Color();
  color.setHSL(fallback.h, fallback.s, fallback.l);
  if (typeof window === "undefined") return color;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  if (!raw) return color;
  try {
    // Accepts any CSS colour form three.js understands, including the hex the
    // token itself is defined as.
    return new THREE.Color(raw);
  } catch {
    return color;
  }
}

/** Accent for the station the viewer is standing on. */
export const TWIN_ACCENT_FALLBACK = { h: 0.59, s: 1, l: 0.62 };
/** Untextured mesh surface — a light neutral so geometry reads as a surface. */
export const MESH_SURFACE_FALLBACK = { h: 0.58, s: 0.12, l: 0.82 };
/** Bounce light from below, keeping the underside of geometry legible. */
export const MESH_GROUND_FALLBACK = { h: 0.58, s: 0.14, l: 0.16 };
