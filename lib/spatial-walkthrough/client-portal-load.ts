import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBrandTheme } from "./theme";
import type { PortalLandingData } from "./portal-fixtures";

export async function loadClientPortalLanding(args: {
  orgId: string;
  walkthroughId: string;
  token: string;
}): Promise<PortalLandingData | null> {
  const admin = createAdminClient();
  const { data: walk } = await admin
    .from("spatial_walkthroughs")
    .select("id, org_id, project_id, title, captured_at, building, floor, status")
    .eq("id", args.walkthroughId)
    .eq("org_id", args.orgId)
    .maybeSingle();
  if (!walk) return null;

  const projectId = walk.project_id as string | null;
  const { data: walks } = projectId
    ? await admin
        .from("spatial_walkthroughs")
        .select("id, title, captured_at, building, floor, status")
        .eq("project_id", projectId)
        .eq("org_id", args.orgId)
        .in("status", ["ready", "published"])
        .order("captured_at", { ascending: false })
        .limit(12)
    : { data: [walk] };

  const rows = walks ?? [walk];
  const clips = await Promise.all(
    rows.map(async (w) => {
      const { data: clip } = await admin
        .from("spatial_clips")
        .select("id")
        .eq("walkthrough_id", w.id)
        .eq("status", "ready")
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      const href = `/w/${args.token}`;
      const posterUrl = clip
        ? `/api/spatial-walkthrough/public/${args.token}/media?clip=${clip.id}&kind=hero`
        : null;
      return {
        id: w.id,
        title: w.title,
        capturedAt: w.captured_at,
        kind: "walkthrough",
        status: w.status,
        posterUrl,
        href: w.id === args.walkthroughId ? href : href,
      };
    }),
  );

  const { data: pins } = await admin
    .from("spatial_pins")
    .select("id, label, pin_type, body, status, visibility, t_seconds, yaw_deg, pitch_deg")
    .eq("walkthrough_id", args.walkthroughId)
    .neq("visibility", "internal");
  const pinIds = (pins ?? []).map((p) => p.id);
  const { data: attachments } = pinIds.length
    ? await admin.from("spatial_pin_attachments").select("id, pin_id, title, kind, visible_on_public").in("pin_id", pinIds)
    : { data: [] as Array<{ id: string; pin_id: string; title: string; kind: string; visible_on_public: boolean }> };

  const clientPins = (pins ?? []).filter((p) => p.visibility === "client" || p.visibility === "public");
  const docs = attachments ?? [];
  const open = clientPins.filter((p) => p.status !== "closed").length;
  const questions = clientPins.filter((p) => p.pin_type === "rfi" || p.pin_type === "note").length;

  const { data: project } = projectId
    ? await admin.from("projects").select("id, name, location").eq("id", projectId).maybeSingle()
    : { data: null };

  const brand = resolveBrandTheme({ snapshot: { showPoweredBy: true, logoOpacity: 0.88 }, canHidePoweredBy: true });
  const hero = clips[0] ?? null;

  const items = clientPins.map((p) => ({
    id: p.id,
    type: p.pin_type,
    title: p.label,
    status: p.status ?? "open",
    priority: p.pin_type === "rfi" ? "high" : "normal",
    href: `/portal/${args.token}/item/${p.id}`,
    locatorHref: `/w/${args.token}?pin=${p.id}&t=${p.t_seconds ?? 0}&yaw=${p.yaw_deg ?? 0}&pitch=${p.pitch_deg ?? 0}`,
  }));

  return {
    profile: "construction",
    projectName: project?.name || walk.building || walk.title,
    location: project?.location || [walk.building, walk.floor].filter(Boolean).join(" · ") || null,
    latestCaptureAt: hero?.capturedAt ?? walk.captured_at,
    brand,
    hero,
    history: clips,
    attention: { open, urgent: clientPins.filter((p) => p.pin_type === "rfi").length, questions },
    documents: docs.map((d) => {
      const pin = clientPins.find((p) => p.id === d.pin_id);
      return {
        id: d.id,
        title: d.title || "Document",
        kind: d.kind || "file",
        href: `/portal/${args.token}/item/${d.pin_id}`,
        thumbUrl: hero?.posterUrl ?? null,
        locatorHref: pin
          ? `/w/${args.token}?pin=${d.pin_id}&t=${pin.t_seconds ?? 0}&yaw=${pin.yaw_deg ?? 0}&pitch=${pin.pitch_deg ?? 0}`
          : `/w/${args.token}?pin=${d.pin_id}`,
      };
    }),
    projects: [
      {
        id: project?.id || walk.id,
        name: project?.name || walk.title,
        location: project?.location ?? walk.building,
        thumbUrl: hero?.posterUrl ?? null,
        href: `/portal/${args.token}`,
      },
    ],
    compareAvailable: clips.length > 1,
    shareHref: `/w/${args.token}`,
    token: args.token,
    items,
    activity: items.map((item) => ({
      id: item.id,
      title: item.title,
      kind: item.type === "rfi" || item.type === "note" ? "question" : item.type,
      href: item.href,
      createdAt: walk.captured_at,
    })),
    captureTree: [
      { label: [walk.building, walk.floor].filter(Boolean).join(" · ") || "Interior", status: "ready" as const, href: `/w/${args.token}` },
      { label: walk.title || "Main Walk", status: "ready" as const, href: `/w/${args.token}` },
    ],
  };
}
