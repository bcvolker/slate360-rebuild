import "server-only";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { unstable_cache } from "next/cache";
import { BUCKET, s3 } from "@/lib/s3";
import type { TrainingRasterizer } from "@/lib/digital-twin/twin-manifest";
import { GOLDEN_SHA256 } from "./scene-config";

/** Pinned golden Room 213 artefacts (read-only; nothing from a request reaches a storage key). */
const DIAG = "experimental/spirula-hardened/detail-diag-2026-09-25/models/golden";
export const GOLDEN_KEYS = {
  ply: `${DIAG}/splat.ply`,
  config: `${DIAG}/config.json`,
  provenance: `${DIAG}/provenance.json`,
} as const;
export const GOLDEN_BYTES = 247_032_347;
/** Content-hashed public file name for the golden PLY (immutable caching is safe: the name changes with the bytes). */
export const GOLDEN_FILE = `golden-${GOLDEN_SHA256.slice(0, 16)}.ply`;

async function readJson(key: string): Promise<Record<string, unknown>> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  // Spirula writes non-standard JSON numbers (e.g. "outlier_threshold": Infinity); none are fields we read.
  const text = ((await res.Body?.transformToString()) ?? "{}").replace(/:\s*-?(Infinity|NaN)\b/g, ": null");
  return JSON.parse(text) as Record<string, unknown>;
}

/**
 * The golden model's training rasterizer, read from its OWN stored provenance (resolved Spirula config for the
 * primitive, provenance record for the trainer revision) so the viewer picks the render profile from provenance,
 * never from a file name. Cached for a day; returns null (→ Spark defaults + visible notice) if unreadable.
 */
export const goldenTrainingRasterizer = unstable_cache(
  async (): Promise<TrainingRasterizer | null> => {
    try {
      const [cfg, prov] = await Promise.all([readJson(GOLDEN_KEYS.config), readJson(GOLDEN_KEYS.provenance)]);
      const spirula = prov.spirula as { commit?: unknown } | undefined;
      const revision = typeof prov.spirulaSha === "string" ? prov.spirulaSha : typeof spirula?.commit === "string" ? spirula.commit : null;
      if (!revision || typeof cfg.primitive !== "string") return null;
      return { trainer: "spirula", trainer_revision: revision, primitive: cfg.primitive, screen_blur_px2: cfg.primitive === "3dgut" ? 0 : undefined };
    } catch {
      return null;
    }
  },
  ["room213-golden-training-rasterizer", GOLDEN_SHA256],
  { revalidate: 86_400 },
);
