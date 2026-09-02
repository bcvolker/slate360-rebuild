import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok } from "@/lib/server/api-response";
import { publicShareDenial } from "@/lib/spatial-walkthrough/share-token";
import { listPayload, toProjectItem, visibleItems } from "@/lib/spatial-walkthrough/project-items";
import { pinRowToProjectItem } from "@/lib/spatial-walkthrough/pins-as-items";
import { loadLocators } from "@/lib/spatial-walkthrough/project-item-store";
import { readGuestKey, resolveShareAudience } from "@/lib/spatial-walkthrough/item-public-access";
import { createRateLimiter } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

const checkRateLimit = createRateLimiter("spatial-walkthrough:public-items", 30, 60);

export const GET = async (req: NextRequest, ctx: Ctx) => {
  const limited = await checkRateLimit(req);
  if (limited) return limited;
  const { token } = await ctx.params;
  const share = await resolveShareAudience(req, token);
  if (!share.ok) return NextResponse.json(publicShareDenial(), { status: 404 });
  const { data: wt } = await share.admin.from("spatial_walkthroughs").select("id, project_id, org_id").eq("id", share.row.walkthrough_id).maybeSingle();
  if (!wt) return NextResponse.json(publicShareDenial(), { status: 404 });
  const { data, error } = await share.admin
    .from("spatial_project_items")
    .select("*")
    .eq("org_id", wt.org_id)
    .eq("project_id", wt.project_id)
    .order("created_at", { ascending: false });
  let all;
  if (error || !wt.project_id) {
    const { data: pins } = await share.admin
      .from("spatial_pins")
      .select("id, project_id, label, body, pin_type, status, visibility, created_at, walkthrough_id, clip_id, t_seconds, yaw_deg, pitch_deg")
      .eq("walkthrough_id", wt.id)
      .neq("visibility", "internal");
    all = (pins ?? []).map((pin) => pinRowToProjectItem(pin, String(wt.project_id ?? wt.id)));
  } else {
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const locators = await loadLocators(share.admin, rows.map((r) => String(r.id)));
    all = rows.map((row) => toProjectItem(row, locators.get(String(row.id)) ?? []));
  }
  const guest = await readGuestKey();
  const visible = visibleItems(all, share.audience, null, guest);
  const mine = req.nextUrl.searchParams.get("mine") === "1"
    ? visible.filter((item) => item.guestKey === guest || (guest && item.guestKey === guest))
    : visible;
  return ok(listPayload(mine));
};
