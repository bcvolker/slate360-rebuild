import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { loadShareRow, shareDenied, passwordOk } from "@/lib/spatial-walkthrough/share-resolve";
import {
  SHARE_UNLOCK_COOKIE,
  createShareUnlockProof,
  shareUnlockCookieName,
} from "@/lib/spatial-walkthrough/share-session";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";
import { recordWalkthroughAudit } from "@/lib/spatial-walkthrough/audit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

const checkRateLimit = createRateLimiter("spatial-walkthrough:unlock", 8, 60);

export const POST = async (req: NextRequest, ctx: Ctx) => {
  const limited = await checkRateLimit(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const { admin, row } = await loadShareRow(token);
  if (shareDenied(row) || !row) return NextResponse.json(publicShareDenial(), { status: 404 });

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = typeof body?.code === "string" ? body.code : "";
  const hash = row.token_hash ?? "";
  const ok = passwordOk(row, code);

  await recordWalkthroughAudit(admin, {
    orgId: row.org_id,
    event: ok ? "access_code_success" : "access_code_failure",
    walkthroughId: row.walkthrough_id,
    resourceId: row.id,
  });

  if (!ok) return NextResponse.json(publicShareDenial(), { status: 401 });
  if (row.password_hash && hash) {
    const jar = await cookies();
    jar.set(shareUnlockCookieName(hash), createShareUnlockProof(hash, row.password_hash), SHARE_UNLOCK_COOKIE);
  }
  return NextResponse.json({ unlocked: true });
};
