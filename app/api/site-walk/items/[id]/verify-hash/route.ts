/**
 * POST /api/site-walk/items/[id]/verify-hash
 *
 * Server-side evidentiary re-verification: fetch the stored object from S3,
 * recompute its SHA-256, and compare to the on-device capture hash. Writes the
 * result (server_sha256 / hash_verified_at) onto the item and appends a
 * `hash_verified` (or `hash_mismatch`) event to the chain of custody. This is the
 * step that lets the record satisfy FRE 902(14) — a match proves the bytes are
 * unchanged since capture.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "@/lib/s3";
import { sha256Hex } from "@/lib/site-walk/content-hash";
import { recordEvidenceEvent } from "@/lib/site-walk/evidence-events";

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: item } = await admin
      .from("site_walk_items")
      .select("id, project_id, s3_key, metadata, capture_sha256")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!item) return notFound("Item not found");

    const s3Key = item.s3_key as string | null;
    const meta = (item.metadata ?? {}) as Record<string, unknown>;
    const expected =
      (typeof item.capture_sha256 === "string" && item.capture_sha256) ||
      (typeof meta.content_sha256 === "string" ? meta.content_sha256 : null);
    if (!s3Key) return badRequest("Item has no stored file to verify");
    if (!expected) return badRequest("Item has no capture hash to verify against");

    let serverHash: string;
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
      const body = obj.Body as { transformToByteArray: () => Promise<Uint8Array> } | undefined;
      if (!body) return serverError("Could not read stored file");
      const bytes = await body.transformToByteArray();
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      serverHash = await sha256Hex(ab);
    } catch {
      return serverError("Failed to fetch the stored file for verification");
    }

    const verified = serverHash === expected;
    const verifiedAt = new Date().toISOString();

    await admin
      .from("site_walk_items")
      .update({ capture_sha256: expected, server_sha256: serverHash, hash_verified_at: verifiedAt })
      .eq("id", id)
      .eq("org_id", orgId);

    await recordEvidenceEvent({
      admin,
      orgId,
      projectId: (item.project_id as string | null) ?? null,
      entityType: "site_walk_item",
      entityId: id,
      eventType: verified ? "hash_verified" : "hash_mismatch",
      actorUserId: user.id,
      contentSha256: serverHash,
      metadata: { expected, server_sha256: serverHash, verified },
    });

    return ok({ verified, server_sha256: serverHash, capture_sha256: expected, hash_verified_at: verifiedAt });
  });
