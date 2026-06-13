import type { ThermalQualityMetrics } from "@/lib/thermal/types";

export type DroneProfile = {
  id: string;
  label: string;
  exif_fingerprints?: {
    make_contains?: string[];
    model_contains?: string[];
  };
  xmp_markers?: string[];
  radiometric_parser_id: string;
  default_emissivity: number;
  default_width?: number;
  default_height?: number;
  linear_scale?: number;
  linear_offset_k?: number;
  extraction_tags?: string[];
  recommended_capture_settings?: Record<string, unknown>;
};

import autel from "@/lib/thermal/drone-profiles/autel-evo-ii-dual-640t.json";
import djiM3t from "@/lib/thermal/drone-profiles/dji-mavic-3t.json";
import djiM30t from "@/lib/thermal/drone-profiles/dji-matrice-30t.json";
import flir from "@/lib/thermal/drone-profiles/flir-rjpeg.json";
import generic from "@/lib/thermal/drone-profiles/generic-radiometric.json";

export const DRONE_PROFILES: readonly DroneProfile[] = [
  autel as DroneProfile,
  djiM3t as DroneProfile,
  djiM30t as DroneProfile,
  flir as DroneProfile,
  generic as DroneProfile,
];

export type DroneDetectionResult = {
  profile: DroneProfile;
  confidence: number;
};

export function detectDroneProfile(meta: Record<string, unknown>): DroneDetectionResult {
  const make = String(meta.Make ?? meta["EXIF:Make"] ?? "").toUpperCase();
  const model = String(meta.Model ?? meta["EXIF:Model"] ?? "").toUpperCase();
  const metaText = JSON.stringify(meta).toUpperCase();

  let best: DroneProfile = generic as DroneProfile;
  let bestScore = 0;

  for (const profile of DRONE_PROFILES) {
    if (profile.id === "generic-radiometric") continue;
    let score = 0;
    for (const fragment of profile.exif_fingerprints?.make_contains ?? []) {
      if (make.includes(fragment.toUpperCase())) score += 0.35;
    }
    for (const fragment of profile.exif_fingerprints?.model_contains ?? []) {
      if (model.includes(fragment.toUpperCase())) score += 0.45;
    }
    for (const marker of profile.xmp_markers ?? []) {
      if (metaText.includes(marker.toUpperCase())) score += 0.2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = profile;
    }
  }

  return {
    profile: best,
    confidence: Math.min(1, Math.max(0.2, bestScore)),
  };
}

export function profileToQualityHint(profile: DroneProfile): Partial<ThermalQualityMetrics> {
  return {
    parser_id: profile.radiometric_parser_id,
    sensor_make: profile.exif_fingerprints?.make_contains?.[0],
    sensor_model: profile.label,
  };
}
