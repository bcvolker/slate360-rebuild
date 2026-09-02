import "server-only";

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { loadShareRow, passwordOk, shareDenied } from "./share-resolve";
import { sessionUnlocksShare } from "./share-session";
import { audienceFromSharePolicy, type ItemAudience } from "./project-items";

export const GUEST_COOKIE = "sw_item_guest";

export async function readGuestKey(): Promise<string | null> {
  try {
    return (await cookies()).get(GUEST_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export function mintGuestKey(): string {
  return crypto.randomUUID();
}

export async function resolveShareAudience(req: NextRequest, token: string) {
  const { admin, row } = await loadShareRow(token);
  if (shareDenied(row) || !row) return { ok: false as const, admin };
  const unlocked = sessionUnlocksShare({ req, tokenHash: row.token_hash ?? "", passwordHash: row.password_hash });
  const password = req.headers.get("x-walkthrough-pass") || req.nextUrl.searchParams.get("code");
  if (!unlocked && !passwordOk(row, password)) return { ok: false as const, admin };
  const audience: ItemAudience = audienceFromSharePolicy(row.policy);
  return { ok: true as const, admin, row, audience };
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function asNum(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function locatorFromBody(body: Record<string, unknown>, walkthroughId: string): {
  walkthroughId: string;
  clipId: string | null;
  chapterId: string | null;
  tSeconds: number | null;
  yawDeg: number | null;
  pitchDeg: number | null;
} {
  return {
    walkthroughId: asString(body.walkthroughId) ?? walkthroughId,
    clipId: asString(body.clipId),
    chapterId: asString(body.chapterId),
    tSeconds: asNum(body.tSeconds ?? body.t),
    yawDeg: asNum(body.yawDeg ?? body.yaw),
    pitchDeg: asNum(body.pitchDeg ?? body.pitch),
  };
}
