import { NextResponse, type NextRequest } from "next/server";

import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";

/**
 * Regression fixture for splat colour fidelity (e2e/spark-render-fidelity.spec.ts). A generated PLY: two
 * stacked, semi-transparent (α 0.35) wide Gaussians whose colour is ABOVE 1 (1.8), centred in the view. Trained
 * models legitimately contain such splats; a viewer that clamps per-splat colour to [0, 1] composites the
 * wall to ~0.58 (≈148/255), one that keeps it composites to ≥1 (255). The manifest carries (or, with
 * provenance=off, omits) the verified Spirula `training_rasterizer`, so the test also proves the profile
 * selected from provenance reaches the real renderer.
 */
const C0 = 0.28209479177387814;
const COLOUR = 1.8;
const OPACITY = 0.35;

function fixturePly(): Buffer {
  const props = ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2", "opacity",
    "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"];
  const n = 2;
  const header = `ply\nformat binary_little_endian 1.0\nelement vertex ${n}\n${props.map((p) => `property float ${p}`).join("\n")}\nend_header\n`;
  const body = new Float32Array(n * props.length);
  const dc = (COLOUR - 0.5) / C0;
  const logit = Math.log(OPACITY / (1 - OPACITY));
  // File frame; the viewer flips by Rx(π), so file +z lands at viewer −z (in front of the camera).
  [2.0, 2.1].forEach((z, i) => {
    body.set([0, 0, z, 0, 0, 0, dc, dc, dc, logit, Math.log(0.4), Math.log(0.4), Math.log(0.02), 1, 0, 0, 0], i * props.length);
  });
  return Buffer.concat([Buffer.from(header, "ascii"), Buffer.from(body.buffer)]);
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") return NextResponse.json({ error: "not found" }, { status: 404 });
  const q = request.nextUrl.searchParams;
  if (q.get("kind") === "manifest.json") {
    const manifest: SplatManifest = {
      version: 1,
      correction_quaternion: [0, 0, 0, 1],
      initial_camera: { position: [0, 0, 0], rotation: [0, 0, 0, 1], source: "capture_pose" },
    };
    if (q.get("provenance") !== "off") {
      manifest.training_rasterizer = {
        trainer: "spirula",
        trainer_revision: "fd1afca1c47f89c98c8e64929f1c73b82571e5f3",
        primitive: "3dgut",
        screen_blur_px2: 0,
      };
    }
    return NextResponse.json(manifest, { headers: { "Cache-Control": "no-store" } });
  }
  if (q.get("kind") !== "ply") return NextResponse.json({ error: "invalid kind" }, { status: 400 });
  const ply = fixturePly();
  return new Response(new Uint8Array(ply), {
    headers: { "Content-Type": "application/octet-stream", "Content-Length": String(ply.byteLength), "Cache-Control": "no-store" },
  });
}
