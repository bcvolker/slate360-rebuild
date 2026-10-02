import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBrandTheme } from "./theme";
import { orgThemeFromRow } from "./org-theme";
import type { PortalLandingData } from "./portal-fixtures";
import { applyPortalCapabilities, gatePortalCapabilities } from "./portal-gating";
import { resolveShareDeliverables } from "@/lib/spatial-experience/portal-package-load";

export async function loadClientPortalLanding(args: {
  orgId: string;
  walkthroughId: string;
  token: string;
  /** Share row fields that decide packaging and operator preview. */
  share: { org_id: string; walkthrough_id: string; deliverables?: unknown; purpose?: string | null };
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
  // Only this share's own walkthrough: the token cannot serve another visit's media,
  // and unpublished visits must never reach a client. Visits return with the Tour.
  const rows = [walk];
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
        href,
      };
    }),
  );

  const pinSelect = "id, label, pin_type, body, status, visibility, t_seconds, yaw_deg, pitch_deg, walkthrough_id";
  const { data: pins } = projectId
    ? await admin.from("spatial_pins").select(pinSelect).eq("project_id", projectId).neq("visibility", "internal")
    : await admin.from("spatial_pins").select(pinSelect).eq("walkthrough_id", args.walkthroughId).neq("visibility", "internal");
  const pinIds = (pins ?? []).map((p) => p.id);
  const { data: attachments } = pinIds.length
    ? await admin.from("spatial_pin_attachments").select("id, pin_id, title, kind, visible_on_public").in("pin_id", pinIds)
    : { data: [] as Array<{ id: string; pin_id: string; title: string; kind: string; visible_on_public: boolean }> };

  const clientPins = (pins ?? []).filter(
    (p) =>
      (p.visibility === "client" || p.visibility === "public") &&
      !/housewalk|kitchen|landing rail|ceiling stain/i.test(p.label ?? ""),
  );
  const docs = attachments ?? [];
  const open = clientPins.filter((p) => p.status !== "closed").length;
  const questions = clientPins.filter((p) => p.pin_type === "rfi" || p.pin_type === "note").length;

  const { data: project } = projectId
    ? await admin.from("projects").select("id, name, location").eq("id", projectId).maybeSingle()
    : { data: null };

  const fixtureTitle = (title: string | null | undefined) => /housewalk|kitchen|harbor point/i.test(title ?? "");
  const clientClips = clips.filter((c) => !fixtureTitle(c.title));
  const { data: tours } = projectId
    ? await admin
        .from("project_tours")
        .select("id, title, viewer_slug, status")
        .eq("project_id", projectId)
        .eq("status", "published")
        .limit(8)
    : { data: [] };
  const stationTour = (tours ?? []).find((t) => t.viewer_slug && !fixtureTitle(t.title));
  const { data: twinSpace } = projectId
    ? await admin
        .from("digital_twin_spaces")
        .select("id, title, published_model_id, settings")
        .eq("project_id", projectId)
        .not("published_model_id", "is", null)
        .is("deleted_at", null)
        .limit(8)
    : { data: [] };
  const twin = (twinSpace ?? []).find((s) => {
    if (fixtureTitle(s.title)) return false;
    const settings = (s.settings as { localQa?: string; qaStatus?: string; humanReviewAccepted?: boolean } | null) ?? {};
    const qa = settings.qaStatus ?? settings.localQa;
    return qa === "accepted" && settings.humanReviewAccepted === true;
  });
  const { data: twinShare } = twin
    ? await admin.from("digital_twin_share_tokens").select("token, is_revoked").eq("space_id", twin.id).eq("is_revoked", false).limit(1).maybeSingle()
    : { data: null };
  const { data: planSets } = projectId
    ? await admin.from("site_walk_plan_sets").select("id").eq("project_id", projectId).neq("processing_status", "archived").limit(5)
    : { data: [] as Array<{ id: string }> };
  const planSetIds = (planSets ?? []).map((set) => set.id);
  const { data: planSheets } = planSetIds.length
    ? await admin.from("site_walk_plan_sheets").select("rasterized_key, thumbnail_s3_key, image_s3_key").in("plan_set_id", planSetIds).limit(8)
    : { data: [] as Array<{ rasterized_key: string | null; thumbnail_s3_key: string | null; image_s3_key: string | null }> };
  const planReady = (planSheets ?? []).some((sheet) => sheet.rasterized_key || sheet.thumbnail_s3_key || sheet.image_s3_key);

  const { data: orgTheme } = await admin.from("spatial_org_themes").select("*").eq("org_id", args.orgId).maybeSingle();
  const brand = resolveBrandTheme({
    org: orgThemeFromRow(orgTheme as Record<string, unknown> | null),
    snapshot: { showPoweredBy: true, logoOpacity: 0.88 },
    canHidePoweredBy: true,
  });
  const hero = clientClips[0] ?? null;

  const items = clientPins.map((p) => ({
    id: p.id,
    type: p.pin_type,
    title: p.label,
    status: p.status ?? "open",
    priority: p.pin_type === "rfi" ? "high" : "normal",
    href: `/portal/${args.token}/item/${p.id}`,
    locatorHref: `/w/${args.token}?pin=${p.id}&t=${p.t_seconds ?? 0}&yaw=${p.yaw_deg ?? 0}&pitch=${p.pitch_deg ?? 0}`,
  }));

  const allowed = await resolveShareDeliverables(admin, args.share);
  const landing: PortalLandingData = {
    profile: "construction",
    projectName: project?.name || walk.building || walk.title,
    location: project?.location || [walk.building, walk.floor].filter(Boolean).join(" · ") || null,
    latestCaptureAt: hero?.capturedAt ?? walk.captured_at,
    brand,
    hero,
    history: clientClips,
    attention: { open, urgent: clientPins.filter((p) => p.pin_type === "rfi").length, questions },
    documents: docs.map((d) => {
      const pin = clientPins.find((p) => p.id === d.pin_id);
      return {
        id: d.id,
        title: d.title || "Document",
        kind: d.kind || "file",
        href: `/portal/${args.token}/item/${d.pin_id}`,
        // The walkthrough poster is not a picture of the document.
        thumbUrl: null,
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
    reality: {
      walkthroughHref: clientClips[0]?.href ?? null,
      twinHref: twinShare?.token ? `/share/twin/${twinShare.token}` : null,
      stationsHref: stationTour?.viewer_slug ? `/tours/view/${stationTour.viewer_slug}` : null,
      aerialHref: null,
    },
    planHref: planReady ? `/portal/${args.token}/plan` : null,
    visitLabel: walk.captured_at ? walk.captured_at.slice(0, 10) : null,
    capabilities: {
      // A walkthrough row without a ready clip would open an empty player.
      walkthrough: Boolean(clientClips[0]?.posterUrl),
      stations: Boolean(stationTour?.viewer_slug),
      plan: planReady,
      twin: Boolean(twinShare?.token),
      aerial: false,
      documents: docs.length > 0,
      history: clientClips.length > 0,
      items: items.length > 0,
    },
    brandName: brand.companyName ?? project?.name ?? null,
    operatorPreview: args.share.purpose === "preview",
  };
  return applyPortalCapabilities(landing, gatePortalCapabilities(landing.capabilities!, allowed));
}
