import type { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { resolveTwinShareSplat } from "@/lib/digital-twin/share-splat";
import { createTwinShareRateLimiter } from "@/lib/digital-twin/share-rate-limit";
import { notFound, serverError } from "@/lib/server/api-response";
import { BUCKET, s3 } from "@/lib/s3";

const checkRate = createTwinShareRateLimiter("twin-share:geometry", 30, 60);

type Params = { params: Promise<{ token: string }> };

type StreamBody = { transformToWebStream?: () => ReadableStream<Uint8Array> };

/**
 * Metric geometry (LiDAR mesh, GLB) for a SHARED twin: the `<key>.geometry.glb` sidecar the
 * Capture Studio publishes beside the `.spz`. Drives click-to-walk, measure and pins in the
 * walkthrough viewer; the splat stays the look layer. 404 when the model has no mesh.
 */
export async function GET(req: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  const blocked = await checkRate(req, token);
  if (blocked) return blocked;

  try {
    const result = await resolveTwinShareSplat(token);
    if (!result.ok) return notFound("Invalid, expired, or unavailable share link");
    const storageKey = result.storageKey;
    if (!storageKey.toLowerCase().endsWith(".spz")) return notFound("No geometry for this model");
    const key = `${storageKey.slice(0, -".spz".length)}.geometry.glb`;

    const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => null);
    if (!object) return notFound("No geometry for this model");

    const body = object.Body as StreamBody | Blob | ReadableStream<Uint8Array> | undefined;
    let stream: ReadableStream<Uint8Array> | Blob | null = null;
    if (body && typeof (body as StreamBody).transformToWebStream === "function") {
      stream = (body as StreamBody).transformToWebStream!();
    } else if (body instanceof Blob || body instanceof ReadableStream) {
      stream = body;
    }
    if (!stream) return serverError("Unable to stream geometry");

    const headers = new Headers({
      "Content-Type": "model/gltf-binary",
      "Cache-Control": "private, max-age=300",
    });
    if (object.ContentLength != null) headers.set("Content-Length", String(object.ContentLength));
    return new Response(stream, { status: 200, headers });
  } catch (err) {
    console.error("[GET /api/share/twin/[token]/geometry]", err);
    return serverError(err instanceof Error ? err.message : "Geometry stream failed");
  }
}
