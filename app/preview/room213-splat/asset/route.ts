import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";

import { BUCKET, s3 } from "@/lib/s3";
import type { SplatManifest, TrainingRasterizer } from "@/lib/digital-twin/twin-manifest";

/**
 * Viewer-fidelity harness for the two verified Room 213 Spirula models (golden 1M, edge-aware 1M).
 * Streams the exact exported PLY the diagnostic measured and a manifest whose `training_rasterizer`
 * is read from the models' OWN provenance files in storage (resolved Spirula config.json → primitive,
 * run completion record / benchmark manifest → trainer revision) — never from the file name.
 *
 * Pinned to fixed experimental keys (no key from the query string). Not served on production deploys.
 * `provenance=off` serves the same manifest without `training_rasterizer` (= how every model without
 * provenance is drawn: the Spark default profile) so before/after use identical cameras.
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

/** Real source-camera centres of the matched diagnostic views, in the viewer's post-π-flip frame
 * (position = Rx(π)·C, rotation = Rx(π)·R_c2w·diag(1,-1,-1) as [x,y,z,w]). */
const VIEWS: Record<string, { position: number[]; rotation: [number, number, number, number] }> = {
  carpet_a0_indep: { position: [-3.9109423, 0.002810236, -0.329527655], rotation: [-0.341973023, 0.274065431, -0.062919634, 0.896651387] },
  carpet_a3_indep: { position: [-4.151804862, 0.056652119, 0.30434852], rotation: [-0.264900074, 0.252723885, 0.276762471, 0.888459973] },
  carpet_a0_fixed: { position: [-4.320409111, 0.044320183, 0.103810922], rotation: [-0.233352312, 0.298095293, 0.263470996, 0.887281764] },
};

export const dynamic = "force-dynamic";

async function readJson(key: string): Promise<Record<string, unknown>> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  // Spirula writes non-standard JSON numbers (e.g. "outlier_threshold": Infinity); none are fields we read.
  const text = ((await res.Body?.transformToString()) ?? "{}").replace(/:\s*-?(Infinity|NaN)\b/g, ": null");
  return JSON.parse(text) as Record<string, unknown>;
}

async function trainingRasterizer(model: keyof typeof MODELS): Promise<TrainingRasterizer | null> {
  const cfg = await readJson(MODELS[model].config);
  const prov = await readJson(MODELS[model].provenance);
  const revision =
    typeof prov.spirulaSha === "string"
      ? prov.spirulaSha
      : typeof (prov.spirula as { commit?: unknown } | undefined)?.commit === "string"
        ? ((prov.spirula as { commit: string }).commit)
        : null;
  if (!revision || typeof cfg.primitive !== "string") return null;
  return { trainer: "spirula", trainer_revision: revision, primitive: cfg.primitive, screen_blur_px2: cfg.primitive === "3dgut" ? 0 : undefined };
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "not found" }, { status: 404 });
  const q = request.nextUrl.searchParams;
  const model = q.get("model") === "edge" ? "edge" : q.get("model") === "golden" ? "golden" : null;
  if (!model) return NextResponse.json({ error: "invalid model" }, { status: 400 });

  if (q.get("kind") === "manifest.json") {
    const view = VIEWS[q.get("view") ?? "carpet_a0_indep"] ?? VIEWS.carpet_a0_indep;
    const manifest: SplatManifest = {
      version: 1,
      coordinate_system: "three_y_up_post_pi_flip",
      correction_quaternion: [0, 0, 0, 1],
      initial_camera: { position: view.position, rotation: view.rotation, source: "capture_pose" },
    };
    if (q.get("provenance") !== "off") {
      const tr = await trainingRasterizer(model);
      if (tr) manifest.training_rasterizer = tr;
    }
    return NextResponse.json(manifest, { headers: { "Cache-Control": "no-store" } });
  }
  if (q.get("kind") !== "ply") return NextResponse.json({ error: "invalid kind" }, { status: 400 });

  const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: MODELS[model].ply }));
  const stream = (object.Body as { transformToWebStream?: () => ReadableStream<Uint8Array> } | undefined)?.transformToWebStream?.();
  if (!stream) return NextResponse.json({ error: "empty object" }, { status: 404 });
  const headers = new Headers({ "Content-Type": "application/octet-stream", "Cache-Control": "no-store" });
  if (object.ContentLength != null) headers.set("Content-Length", String(object.ContentLength));
  return new Response(stream, { status: 200, headers });
}
