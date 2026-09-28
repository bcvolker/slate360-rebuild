import type * as THREE from "three";

/** Internal-only (?internal=1) scene overrides used by verification probes. Never set for recipients. */
export type SceneDebug = {
  /** Replace the composed presentation crop with an explicit V-frame box (frame / band tests). */
  cropOverride?: THREE.Box3 | null;
  /** On-device A/B switches for the motion-artefact investigation (?probe=1&diag=bg,px,alpha). */
  diag?: string[];
};
