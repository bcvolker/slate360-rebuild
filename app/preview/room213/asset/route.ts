import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";

import { BUCKET, s3 } from "@/lib/s3";
import type { SplatManifest, TrainingRasterizer } from "@/lib/digital-twin/twin-manifest";
import { ROOM213_BASE_MANIFESTS } from "./manifests";

/**
 * Room 213 review viewer assets: the exact exported Spirula PLYs (golden 1M = default; edge-aware = internal
 * comparison) and their manifest. `training_rasterizer` is read from each model's OWN stored provenance —
 * resolved Spirula config.json (primitive) + run completion record / benchmark manifest (trainer revision) —
 * so the viewer selects the verified render profile from provenance, never from a file name.
 * Pinned to fixed keys (nothing from the query reaches a storage key). Not served on production deploys.
 */
const DIAG = "experimental/spirula-hardened/detail-diag-2026-09-25";
const EDGE = "experimental/spirula-hardened/runs/room213-edgeaware-densify-v1";
const MODELS = {
  golden: {
    ply: `${DIAG}/models/golden/splat.ply`,
    config: `${DIAG}/models/golden/config.json`,
    provenance: `${DIAG}/models/golden/provenance.json`,
  },
  edge: {
    ply: `${EDGE}/final/room213-edgeaware-densify-v1-a01/run/step-000030000.ckpt/splat.ply`,
    config: `${EDGE}/final/room213-edgeaware-densify-v1-a01/run/config.json`,
    provenance: `${EDGE}/COMPLETED.json`,
  },
} as const;

export const dynamic = "force-dynamic";
// A 247 MB PLY streams through this function on a cold request.
export const maxDuration = 300;

async function readJson(key: string): Promise<Record<string, unknown>> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  // Spirula writes non-standard JSON numbers (e.g. "outlier_threshold": Infinity); none are fields we read.
  const text = ((await res.Body?.transformToString()) ?? "{}").replace(/:\s*-?(Infinity|NaN)\b/g, ": null");
  return JSON.parse(text) as Record<string, unknown>;
}

async function trainingRasterizer(model: keyof typeof MODELS): Promise<TrainingRasterizer | null> {
  const [cfg, prov] = await Promise.all([readJson(MODELS[model].config), readJson(MODELS[model].provenance)]);
  const spirula = prov.spirula as { commit?: unknown } | undefined;
  const revision =
    typeof prov.spirulaSha === "string" ? prov.spirulaSha : typeof spirula?.commit === "string" ? spirula.commit : null;
  if (!revision || typeof cfg.primitive !== "string") return null;
  return {
    trainer: "spirula",
    trainer_revision: revision,
    primitive: cfg.primitive,
    screen_blur_px2: cfg.primitive === "3dgut" ? 0 : undefined,
  };
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "not found" }, { status: 404 });
  const q = request.nextUrl.searchParams;
  const model = q.get("model") === "edge" ? "edge" : "golden";

  if (q.get("kind") === "manifest.json") {
    const manifest: SplatManifest = { ...ROOM213_BASE_MANIFESTS[model] };
    if (q.get("dollhouse") === "full") delete manifest.dollhouse_edit_list; // internal: uncropped exterior view
    const tr = await trainingRasterizer(model);
    if (tr) manifest.training_rasterizer = tr;
    return NextResponse.json(manifest, { headers: { "Cache-Control": "no-store" } });
  }
  if (q.get("kind") !== "ply") return NextResponse.json({ error: "invalid kind" }, { status: 400 });

  const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: MODELS[model].ply }));
  const stream = (object.Body as { transformToWebStream?: () => ReadableStream<Uint8Array> } | undefined)?.transformToWebStream?.();
  if (!stream) return NextResponse.json({ error: "empty object" }, { status: 404 });
  const headers = new Headers({ "Content-Type": "application/octet-stream", "Cache-Control": "public, max-age=3600" });
  if (object.ContentLength != null) headers.set("Content-Length", String(object.ContentLength));
  return new Response(stream, { status: 200, headers });
}
