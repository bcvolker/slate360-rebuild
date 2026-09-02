import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRateLimiter } from "@/lib/server/rate-limit";
import { loadProjectShareRow, shareDenied, projectSharePasswordOk, recordPortalAudit } from "@/lib/spatial-walkthrough/project-share";
import { SHARE_UNLOCK_COOKIE, createShareUnlockProof, shareUnlockCookieName } from "@/lib/spatial-walkthrough/share-session";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

const checkRateLimit = createRateLimiter("portal:unlock", 8, 60);

export const POST = async (req: NextRequest, ctx: Ctx) => {
  const limited = await checkRateLimit(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const { admin, row } = await loadProjectShareRow(token);
  if (shareDenied(row) || !row) return NextResponse.json(publicShareDenial(), { status: 404 });

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = typeof body?.code === "string" ? body.code : "";
  const ok = projectSharePasswordOk(row, code);

  await recordPortalAudit(admin, {
    orgId: row.org_id,
    projectId: row.project_id,
    shareId: row.id,
    event: ok ? "portal_access_code_success" : "portal_access_code_failure",
  });

  if (!ok) return NextResponse.json(publicShareDenial(), { status: 401 });
  if (row.password_hash) {
    const jar = await cookies();
    jar.set(shareUnlockCookieName(row.token_hash), createShareUnlockProof(row.token_hash, row.password_hash), SHARE_UNLOCK_COOKIE);
  }
  return NextResponse.json({ unlocked: true });
};
