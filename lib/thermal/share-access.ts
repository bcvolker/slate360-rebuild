import "server-only";

import { cookies } from "next/headers";
import {
  getThermalSharePasswordHash,
  resolveThermalShareToken,
} from "@/lib/thermal/share-token";
import { shareUnlockCookieName, verifyShareUnlockProof } from "@/lib/thermal/share-password";

export async function isThermalShareUnlocked(token: string): Promise<boolean> {
  const gate = await resolveThermalShareToken(token);
  if (!gate.ok) return false;
  if (!gate.requiresPassword) return true;

  const storedHash = await getThermalSharePasswordHash(token);
  if (!storedHash) return true;

  const cookieStore = await cookies();
  const proof = cookieStore.get(shareUnlockCookieName(token))?.value;
  if (!proof) return false;
  return verifyShareUnlockProof(token, storedHash, proof);
}
