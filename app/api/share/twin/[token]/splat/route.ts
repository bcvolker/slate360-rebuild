import type { NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { resolveTwinShareSplat } from "@/lib/digital-twin/share-splat";
import { createTwinShareRateLimiter } from "@/lib/digital-twin/share-rate-limit";
import { notFound, serverError } from "@/lib/server/api-response";
import { BUCKET, s3 } from "@/lib/s3";

const checkRate = createTwinShareRateLimiter("twin-share:splat", 30, 60);

type Params = { params: Promise<{ token: string }> };

type StreamBody = {
  transformToWebStream?: () => ReadableStream<Uint8Array>;
};

export async function GET(req: NextRequest, ctx: Params) {
  const { token } = await ctx.params;
  const blocked = await checkRate(req, token);
  if (blocked) return blocked;

  try {
    const result = await resolveTwinShareSplat(token);
    if (!result.ok) return notFound("Invalid, expired, or unavailable share link");

    const object = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: result.storageKey }),
    );

    const body = object.Body as StreamBody | Blob | ReadableStream<Uint8Array> | undefined;
    let stream: ReadableStream<Uint8Array> | Blob | null = null;
    if (body && typeof (body as StreamBody).transformToWebStream === "function") {
      stream = (body as StreamBody).transformToWebStream!();
    } else if (body instanceof Blob || body instanceof ReadableStream) {
      stream = body;
    }

    if (!stream) return serverError("Unable to stream model asset");

    const headers = new Headers({
      "Content-Type": object.ContentType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
      "Accept-Ranges": "bytes",
    });
    if (object.ContentLength != null) {
      headers.set("Content-Length", String(object.ContentLength));
    }

    return new Response(stream, { status: 200, headers });
  } catch (err) {
    console.error("[GET /api/share/twin/[token]/splat]", err);
    return serverError(err instanceof Error ? err.message : "Model stream failed");
  }
}
