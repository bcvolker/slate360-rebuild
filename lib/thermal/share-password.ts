import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;

export function hashSharePassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifySharePassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expectedHex] = parts;
  const actualHex = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  try {
    return timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(actualHex, "hex"));
  } catch {
    return false;
  }
}

export function shareUnlockCookieName(token: string): string {
  return `thermal_share_unlock_${createHmac("sha256", "thermal-share").update(token).digest("hex").slice(0, 24)}`;
}

export function createShareUnlockProof(token: string, storedHash: string): string {
  return createHmac("sha256", storedHash).update(token).digest("hex");
}

export function verifyShareUnlockProof(token: string, storedHash: string, proof: string): boolean {
  try {
    const expected = createShareUnlockProof(token, storedHash);
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(proof, "hex"));
  } catch {
    return false;
  }
}
