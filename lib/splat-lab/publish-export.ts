import "server-only";

import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadBuffer } from "@/lib/s3-utils";
import { buildCanonicalS3Key, resolveNamespace } from "@/lib/slatedrop/storage";
import { buildCanonicalAssetFilename } from "@/lib/slatedrop/canonical-filename";
import { twinAssetFolderPath } from "@/lib/slatedrop/folder-taxonomy";
import { resolveTwinProjectFolder } from "@/lib/site-walk/slatedrop-folders";
import { trackStorageUsed } from "@/lib/slatedrop/track-storage";

type PublishArgs = {
  admin: SupabaseClient;
  projectId: string;
  orgId: string;
  userId: string;
  jobId: string;
  title: string;
  files: string[];
};

export type PublishedFile = { name: string; s3Key: string; bytes: number };

export async function publishSplatLabExport(args: PublishArgs): Promise<PublishedFile[]> {
  const folderId = await resolveTwinProjectFolder(
    args.admin, args.projectId, args.orgId, args.userId,
    twinAssetFolderPath("Deliverables"),
  );
  if (!folderId) {
    throw new Error("Project has no 03_Digital_Twin/Deliverables folder. Open the project in SlateDrop once, then retry.");
  }

  const ns = resolveNamespace(args.orgId, args.userId);
  const published: PublishedFile[] = [];

  for (const filePath of args.files) {
    if (!existsSync(filePath)) continue;
    const ext = filePath.split(".").pop()?.toLowerCase() || "bin";
    const name = buildCanonicalAssetFilename({
      type: "Deliverable",
      id: `${args.jobId}-${ext}`,
      ext,
    });
    const s3Key = buildCanonicalS3Key(ns, folderId, name);
    const buf = readFileSync(filePath);
    await uploadBuffer(s3Key, buf, "application/octet-stream");

    const { data: existing } = await args.admin
      .from("slatedrop_uploads")
      .select("id")
      .eq("s3_key", s3Key)
      .maybeSingle<{ id: string }>();

    if (!existing) {
      const { data: row, error } = await args.admin
        .from("slatedrop_uploads")
        .insert({
          file_name: `${args.title || basename(filePath)} (${ext})`,
          file_size: buf.length,
          file_type: ext,
          s3_key: s3Key,
          folder_id: folderId,
          org_id: args.orgId,
          uploaded_by: args.userId,
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      if (row?.id) await trackStorageUsed(args.admin, args.orgId, row.id);
    }
    published.push({ name, s3Key, bytes: buf.length });
  }

  if (published.length === 0) throw new Error("No export files found to publish.");
  return published;
}
