import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { claimResolvedShare, resolvePublicShare } from "@/lib/vnext/share/resolve-public-share";
import { decideShareOpen, SHARE_OPEN_COOKIE, shareOpenCookiePath } from "@/lib/vnext/share/share-open-session";
import { isShareToken } from "@/lib/vnext/share/share-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function quiet(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!isShareToken(token)) return quiet();
  const jar = await cookies();
  const { admin, share } = await resolvePublicShare(token);
  if (
    decideShareOpen({
      active: share.state === "active",
      counted: jar.get(SHARE_OPEN_COOKIE)?.value === "1",
    }) !== "claim"
  ) {
    return quiet();
  }
  if (!(await claimResolvedShare(admin, token))) return quiet();
  const response = quiet();
  response.cookies.set(SHARE_OPEN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: shareOpenCookiePath(token),
  });
  return response;
}
