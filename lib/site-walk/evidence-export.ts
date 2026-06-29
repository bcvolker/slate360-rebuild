import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { SupabaseClient } from "@supabase/supabase-js";
// @ts-ignore — jszip types may lag
import JSZip from "jszip";
import { s3, BUCKET } from "@/lib/s3";
import { sha256Hex } from "./content-hash";
import { VERIFY_SCRIPT, VERIFY_README } from "./evidence-verify-script";

// Mirror the slatedrop/zip guards — the archive is assembled in memory, so cap it.
const MAX_TOTAL_BYTES = 1_500_000_000; // ~1.5 GB
const MAX_FILE_COUNT = 1000;
const FETCH_CONCURRENCY = 4;

/** Thrown when the bundle would exceed the in-memory caps → caller returns 413. */
export class EvidenceExportTooLarge extends Error {}

export type EvidenceItemRow = {
  id: string;
  item_type: string | null;
  title: string | null;
  description: string | null;
  s3_key: string | null;
  metadata: Record<string, unknown> | null;
  capture_sha256: string | null;
  server_sha256: string | null;
  hash_verified_at: string | null;
  capture_device_id: string | null;
  created_at: string | null;
};

export type EvidenceDeliverableRow = {
  id: string;
  title: string | null;
  project_id: string | null;
  share_token: string | null;
  shared_at: string | null;
};

function safeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "item";
}

/**
 * Build a Certified Evidence export ZIP for one deliverable: each included item's
 * original media (re-hashed at export and embedded), its append-only
 * chain-of-custody log, a machine-readable MANIFEST.json, and a zero-dependency
 * verifier + README. Media bytes are fetched once and reused for both the hash and
 * the archive. Throws EvidenceExportTooLarge if the caps are exceeded.
 */
export async function buildEvidenceExport(
  admin: SupabaseClient,
  params: {
    deliverable: EvidenceDeliverableRow;
    items: EvidenceItemRow[];
    orgId: string;
    userId: string;
    generatedAt: string;
  },
): Promise<Uint8Array> {
  const { deliverable, items, orgId, userId, generatedAt } = params;

  const mediaItems = items.filter((it) => it.s3_key);
  if (mediaItems.length > MAX_FILE_COUNT) throw new EvidenceExportTooLarge("Too many files");

  const zip = new JSZip();
  const fetched: Record<string, { exportHash: string; mediaPath: string; bytes: number } | null> = {};

  // Bounded worker pool — Promise.all over all objects spikes memory (see slatedrop/zip).
  let totalBytes = 0;
  let cursor = 0;
  const runWorker = async (): Promise<void> => {
    while (cursor < mediaItems.length) {
      const it = mediaItems[cursor++];
      const key = it.s3_key as string;
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        const body = obj.Body as { transformToByteArray: () => Promise<Uint8Array> } | undefined;
        if (!body) { fetched[it.id] = null; continue; }
        const bytes = await body.transformToByteArray();
        totalBytes += bytes.byteLength;
        if (totalBytes > MAX_TOTAL_BYTES) throw new EvidenceExportTooLarge("Export exceeds size cap");
        const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const exportHash = await sha256Hex(ab);
        const ext = key.split(".").pop()?.toLowerCase() ?? "bin";
        const mediaPath = `media/${safeName(it.title || it.id)}-${it.id.slice(0, 8)}.${ext}`;
        zip.file(mediaPath, bytes);
        fetched[it.id] = { exportHash, mediaPath, bytes: bytes.byteLength };
      } catch (e) {
        if (e instanceof EvidenceExportTooLarge) throw e;
        fetched[it.id] = null; // missing/unreadable object — recorded as absent, not fatal
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(FETCH_CONCURRENCY, mediaItems.length) }, runWorker),
  );

  // Per-item: append-only chain log + manifest entry.
  const manifestItems: Record<string, unknown>[] = [];
  for (const it of items) {
    const { data: events } = await admin
      .from("evidence_events")
      .select(
        "id, org_id, project_id, entity_type, entity_id, event_type, actor_user_id, actor_device_id, content_sha256, prev_hash, event_hash, metadata, created_at",
      )
      .eq("entity_type", "site_walk_item")
      .eq("entity_id", it.id)
      .order("id", { ascending: true });
    const chain = events ?? [];
    const evidencePath = `evidence/${it.id}.json`;
    zip.file(evidencePath, JSON.stringify(chain, null, 2));

    const h = fetched[it.id];
    const meta = it.metadata ?? {};
    manifestItems.push({
      id: it.id,
      type: it.item_type,
      title: it.title,
      created_at: it.created_at,
      capture_device_id: it.capture_device_id,
      capture_sha256:
        it.capture_sha256 ?? (typeof meta.content_sha256 === "string" ? meta.content_sha256 : null),
      server_sha256: it.server_sha256,
      hash_verified_at: it.hash_verified_at,
      media_file: h?.mediaPath ?? null,
      export_sha256: h?.exportHash ?? null,
      media_bytes: h?.bytes ?? null,
      evidence_file: evidencePath,
      evidence_event_count: chain.length,
      note_raw: typeof meta.note_raw === "string" ? meta.note_raw : null,
      ai_formatted: meta.ai_formatted === true,
      ai_provenance: meta.ai_provenance ?? null,
    });
  }

  const manifest = {
    kind: "slate360-certified-evidence-export",
    spec_version: 1,
    generated_at: generatedAt,
    generated_by_user_id: userId,
    org_id: orgId,
    deliverable: {
      id: deliverable.id,
      title: deliverable.title,
      project_id: deliverable.project_id,
      share_token: deliverable.share_token,
      shared_at: deliverable.shared_at,
    },
    integrity: {
      media_hash_algorithm: "SHA-256",
      chain: "append-only hash chain (prev_hash -> event_hash) per item, computed server-side",
      verify: "Run `node verify.mjs` to validate media bytes against recorded hashes and chain linkage.",
    },
    items: manifestItems,
  };
  zip.file("MANIFEST.json", JSON.stringify(manifest, null, 2));
  zip.file("verify.mjs", VERIFY_SCRIPT);
  zip.file("README.txt", VERIFY_README);

  const buf = (await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })) as Buffer;
  return new Uint8Array(buf);
}
