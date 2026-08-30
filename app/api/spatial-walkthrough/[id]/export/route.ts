import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { unauthorized, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const GET = (req: NextRequest, ctx: Ctx) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { id } = await ctx.params;
    const { data: wt } = await admin.from("spatial_walkthroughs").select("*").eq("id", id).eq("org_id", orgId).maybeSingle();
    if (!wt) return notFound("Walkthrough not found");
    const [{ data: waypoints }, { data: pins }, { data: shares }] = await Promise.all([
      admin.from("spatial_waypoints").select("*").eq("walkthrough_id", id).order("sort_order"),
      admin.from("spatial_pins").select("*").eq("walkthrough_id", id),
      admin.from("spatial_share_tokens").select("token, policy, is_revoked, expires_at").eq("walkthrough_id", id),
    ]);
    const zip = new JSZip();
    zip.file("walkthrough.json", JSON.stringify({
      product: "Spatial Walkthrough",
      title: wt.title,
      capturedAt: wt.captured_at,
      building: wt.building,
      floor: wt.floor,
      zone: wt.zone,
      type: wt.walkthrough_type,
      durationS: wt.duration_s,
    }, null, 2));
    zip.file("walkthrough.txt", [
      `Spatial Walkthrough: ${wt.title}`,
      `Captured: ${wt.captured_at}`,
      `Building: ${wt.building ?? ""}`,
      `Floor: ${wt.floor ?? ""}`,
      `Zone: ${wt.zone ?? ""}`,
    ].join("\n"));
    const pinCsv = ["id,label,type,t_seconds,yaw,pitch,visibility"]
      .concat((pins ?? []).map((p) => [p.id, csv(p.label), p.pin_type, p.t_seconds, p.yaw_deg, p.pitch_deg, p.visibility].join(",")))
      .join("\n");
    zip.file("pins.csv", pinCsv);
    zip.file("waypoints.json", JSON.stringify(waypoints ?? [], null, 2));
    const links = (shares ?? [])
      .filter((s) => !s.is_revoked)
      .map((s) => `https://www.slate360.ai/w/${s.token} (${s.policy})`)
      .join("\n");
    zip.file("share-links.txt", links || "No active share links.");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="spatial-walkthrough-export.zip"`,
      },
    });
  }, "view");

function csv(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
