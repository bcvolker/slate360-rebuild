import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, notFound, serverError } from "@/lib/server/api-response";
import { BUCKET, s3 } from "@/lib/s3";
import type { IdRouteContext } from "@/lib/types/api";

type PlanSetFileRow = {
  title: string | null;
  original_file_name: string | null;
  source_s3_key: string | null;
  mime_type: string | null;
};

type StreamableS3Body = {
  transformToWebStream?: () => ReadableStream<Uint8Array>;
  transformToByteArray?: () => Promise<Uint8Array>;
};

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: planSet, error } = await admin
      .from("site_walk_plan_sets")
      .select("title, original_file_name, source_s3_key, mime_type")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle<PlanSetFileRow>();

    if (error) return serverError(error.message);
    if (!planSet?.source_s3_key) return notFound("Plan PDF not found");

    const fileName = planSet.original_file_name || `${planSet.title || "site-walk-plan"}.pdf`;

    try {
      const object = await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: planSet.source_s3_key,
        }),
      );
      const body = await toResponseBody(object.Body);
      const headers = new Headers({
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      });
      if (typeof object.ContentLength === "number") headers.set("Content-Length", String(object.ContentLength));
      return new NextResponse(body, { status: 200, headers });
    } catch (error) {
      return serverError(error instanceof Error ? error.message : "Failed to load plan PDF");
    }
  });

async function toResponseBody(body: unknown): Promise<BodyInit> {
  const streamBody = body as StreamableS3Body | null;
  if (streamBody?.transformToWebStream) return streamBody.transformToWebStream();
  if (streamBody?.transformToByteArray) {
    const bytes = await streamBody.transformToByteArray();
    return new Blob([toArrayBuffer(bytes)], { type: "application/pdf" });
  }
  if (body instanceof Blob || body instanceof ReadableStream) return body;
  if (body instanceof Uint8Array) return new Blob([toArrayBuffer(body)], { type: "application/pdf" });
  throw new Error("Plan PDF stream was empty");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
