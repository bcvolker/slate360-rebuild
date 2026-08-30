import { createHash, randomBytes } from "node:crypto";

/** 24 bytes = 192 bits, above the 128-bit floor. */
export const SHARE_TOKEN_BYTES = 24;
export const SHARE_TOKEN_MIN_BITS = 128;

export function mintShareToken(): { token: string; hash: string; prefix: string } {
  const token = randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
  return { token, hash: hashShareToken(token), prefix: token.slice(0, 8) };
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function tokenBitLength(token: string): number {
  try {
    const buf = Buffer.from(token, "base64url");
    return buf.length * 8;
  } catch {
    return 0;
  }
}

export function tokenMeetsEntropyFloor(token: string): boolean {
  return tokenBitLength(token) >= SHARE_TOKEN_MIN_BITS || token.length >= 22;
}

export function publicShareDenial(): { error: "unavailable" } {
  return { error: "unavailable" };
}

export function shareDenied(row: {
  is_revoked: boolean;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
} | null): "unavailable" | null {
  if (!row) return "unavailable";
  if (row.is_revoked) return "unavailable";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "unavailable";
  if (row.max_views != null && row.view_count >= row.max_views) return "unavailable";
  return null;
}
