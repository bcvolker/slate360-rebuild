import { createHash } from "node:crypto";

/**
 * E1 — canonical hash of a model's edit_list, used to detect whether a baked
 * .spz still matches the current edits. Hashes the FULL serialized list
 * (including disabled ops and ordering) so ANY change — toggle, reorder,
 * tweak — marks the bake stale. The worker echoes this hash back in the
 * bake callback; freshness = stored hash === hash(current edit_list).
 */
export function computeEditListHash(editList: unknown): string {
  const canonical = JSON.stringify(Array.isArray(editList) ? editList : []);
  return createHash("sha256").update(canonical).digest("hex");
}

export type BakedExportState = {
  status: "baking" | "ready" | "failed";
  editHash: string;
  bakedKey?: string;
  fileSizeBytes?: number;
  stats?: Record<string, unknown>;
  error?: string;
  requestedAt?: string;
  completedAt?: string;
};

export function parseBakedExport(raw: unknown): BakedExportState | null {
  if (!raw || typeof raw !== "object") return null;
  const state = raw as BakedExportState;
  if (state.status !== "baking" && state.status !== "ready" && state.status !== "failed") {
    return null;
  }
  if (typeof state.editHash !== "string") return null;
  return state;
}

/** True when a ready bake exists for exactly the current edit_list. */
export function isBakeFresh(raw: unknown, editList: unknown): boolean {
  const state = parseBakedExport(raw);
  return (
    state?.status === "ready" &&
    typeof state.bakedKey === "string" &&
    state.editHash === computeEditListHash(editList)
  );
}
