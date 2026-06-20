import type { SlateContentEditSpec } from "./spec-core";

/**
 * Deterministic content hashing for render-spec snapshots.
 *
 * The hash is computed over a canonical (recursively key-sorted) JSON of the spec
 * with volatile/UI fields excluded, so the same edit always yields the same hash
 * and retries are byte-stable. `extensions` is included (it carries real render
 * state); only fields that must never affect output are stripped.
 */

const VOLATILE_TOP_LEVEL_KEYS = new Set<string>([
  // none today — editProjectId/orgId/projectId all affect storage paths and are
  // intentionally part of the hash. Listed here so future UI-only fields are easy to drop.
]);

/** Recursively sort object keys to produce a canonical, stable JSON string. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** SHA-256 hex digest, isomorphic (Web Crypto — works in Node 18+ and the browser). */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Content hash of a spec — stable across re-serialization and key order. */
export async function hashEditSpec(spec: SlateContentEditSpec): Promise<string> {
  const stripped: Record<string, unknown> = { ...(spec as Record<string, unknown>) };
  for (const k of VOLATILE_TOP_LEVEL_KEYS) delete stripped[k];
  return sha256Hex(canonicalJson(stripped));
}
