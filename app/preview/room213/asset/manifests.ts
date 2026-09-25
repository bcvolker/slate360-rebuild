import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";

/**
 * Orientation + framing for the two verified Room 213 Spirula models, produced by the production twin
 * worker's own `compute_splat_manifest` (workers/modal/twin-gaussian-splat/worker.py, run unchanged on the
 * exported PLYs: floor-PCA up axis, 5-95 % core bounds, synthetic exterior orbit camera). No capture-pose
 * `initial_camera`, so the viewer opens on the exterior overview (dollhouse), not inside the room.
 * `training_rasterizer` is added at request time from the models' stored provenance (./route.ts).
 *
 * `dollhouse_edit_list`: the existing non-destructive Crop op (keep inside a box), applied ONLY in the exterior
 * dollhouse view: the room's walls/floor from a top-down occupancy map of the golden model (post-flip x
 * -6.2..5.0, z -4.15..4.5, floor -2.1) with the ceiling lifted at y 0.3, so the exterior view shows the
 * room instead of the fog of window-view splats and the ceiling. Walk mode shows the full, uncropped model.
 * Coordinates: the PLY file frame (the edit is a child of the SplatMesh, whose rotation is the viewer's π flip),
 * i.e. post-flip (x, y, z) -> file (x, -y, -z); margins cover the 2.6 deg orientation correction. Verified on
 * screen from a top-down pose. Half-extents live on the SDF (see lib/digital-twin/splat-edit-runtime.ts).
 */
const DOLLHOUSE_CROP = {
  id: "room213-dollhouse-crop",
  tool: "crop" as const,
  label: "Dollhouse: room only, ceiling lifted",
  sdfType: "box" as const,
  position: [-0.6, -1.15, -0.175] as [number, number, number],
  size: [5.8, 1.25, 4.55] as [number, number, number],
  invert: true,
  opacity: 0,
  rgbaBlendMode: "multiply" as const,
  sdfSmooth: 0.02,
  softEdge: 0.02,
};
const BASE: Record<"golden" | "edge", SplatManifest> = {
  "golden": {
    "version": 1,
    "coordinate_system": "three_y_up_post_pi_flip",
    "bounds": {
      "min": [
        -5.575551509857178,
        -2.0575883388519287,
        -3.5769577026367188
      ],
      "max": [
        4.728501796722412,
        0.8511905074119568,
        3.7411670684814453
      ],
      "center": [
        -0.3577549606561661,
        -1.72819584608078,
        0.07905026897788048
      ],
      "radius": 5.73856346799119
    },
    "up_axis": "Y_UP",
    "tilt_deg": 2.611208977599545,
    "correction_quaternion": [
      0.022784520169697467,
      -0.0,
      0.00016602730216146137,
      0.9997403853378993
    ],
    "fallback_camera": {
      "position": [
        6.881262629529435,
        3.8035171101724154,
        11.886187825943235
      ],
      "target": [
        -0.3577549606561661,
        -1.72819584608078,
        0.07905026897788048
      ],
      "fov": 55.0,
      "near": 0.011477126935982379,
      "far": 60.82198222811655
    },
    "recommended_orbit_camera": {
      "position": [
        6.881262629529435,
        3.8035171101724154,
        11.886187825943235
      ],
      "target": [
        -0.3577549606561661,
        -1.72819584608078,
        0.07905026897788048
      ],
      "fov": 55.0,
      "near": 0.011477126935982379,
      "far": 60.82198222811655
    },
    "interior_entry_point": [
      -0.3577549606561661,
      -0.4575883388519286,
      0.07905026897788048
    ],
    "metric_scale_applied": false
  },
  "edge": {
    "version": 1,
    "coordinate_system": "three_y_up_post_pi_flip",
    "bounds": {
      "min": [
        -5.610480785369873,
        -2.0731303691864014,
        -3.610074520111084
      ],
      "max": [
        4.814547538757324,
        0.8672622442245483,
        4.116448402404785
      ],
      "center": [
        -0.366929292678833,
        -1.2706592082977295,
        -0.3581259697675705
      ],
      "radius": 5.962192152101185
    },
    "up_axis": "Y_UP",
    "tilt_deg": 2.838080763997433,
    "correction_quaternion": [
      0.0247634247663353,
      0.0,
      -0.0002192060264869785,
      0.9996933153435408
    ],
    "fallback_camera": {
      "position": [
        7.154188859253975,
        4.476621580598807,
        11.909129289075212
      ],
      "target": [
        -0.366929292678833,
        -1.2706592082977295,
        -0.3581259697675705
      ],
      "fov": 55.0,
      "near": 0.01192438430420237,
      "far": 63.19218165633626
    },
    "recommended_orbit_camera": {
      "position": [
        7.154188859253975,
        4.476621580598807,
        11.909129289075212
      ],
      "target": [
        -0.366929292678833,
        -1.2706592082977295,
        -0.3581259697675705
      ],
      "fov": 55.0,
      "near": 0.01192438430420237,
      "far": 63.19218165633626
    },
    "interior_entry_point": [
      -0.366929292678833,
      -0.4731303691864013,
      -0.3581259697675705
    ],
    "metric_scale_applied": false
  }
};

export const ROOM213_BASE_MANIFESTS: Record<"golden" | "edge", SplatManifest> = {
  golden: { ...BASE.golden, dollhouse_edit_list: [DOLLHOUSE_CROP] },
  edge: { ...BASE.edge, dollhouse_edit_list: [DOLLHOUSE_CROP] },
};
