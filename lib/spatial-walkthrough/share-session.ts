import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

const COOKIE_PREFIX = "sw_unlock_";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function secret(): string {
  return process.env.GPU_WORKER_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "sw-share-dev";
}

export function shareUnlockCookieName(tokenHash: string): string {
  return `${COOKIE_PREFIX}${tokenHash.slice(0, 24)}`;
}

export function createShareUnlockProof(tokenHash: string, passwordHash: string): string {
  return createHmac("sha256", secret()).update(`${tokenHash}:${passwordHash}`).digest("hex");
}

export function verifyShareUnlockProof(tokenHash: string, passwordHash: string, proof: string): boolean {
  try {
    const expected = createShareUnlockProof(tokenHash, passwordHash);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(proof, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function readUnlockCookie(req: NextRequest, tokenHash: string): string | null {
  return req.cookies.get(shareUnlockCookieName(tokenHash))?.value ?? null;
}

export function cookieUnlocksShare(
  tokenHash: string,
  passwordHash: string | null,
  proof: string | null,
): boolean {
  if (!passwordHash) return true;
  if (!proof) return false;
  return verifyShareUnlockProof(tokenHash, passwordHash, proof);
}

export function sessionUnlocksShare(args: {
  req: NextRequest;
  tokenHash: string;
  passwordHash: string | null;
}): boolean {
  return cookieUnlocksShare(
    args.tokenHash,
    args.passwordHash,
    readUnlockCookie(args.req, args.tokenHash),
  );
}

export const SHARE_UNLOCK_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: MAX_AGE_SEC,
  path: "/",
};
