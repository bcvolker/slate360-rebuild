import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import { escapeLike } from "@/lib/projects/spatial-overview-slices";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";
import { orgThemeFromRow } from "@/lib/spatial-walkthrough/org-theme";
import type { BrandTheme } from "@/lib/spatial-walkthrough/types";

export type ClientChapterKind = "walkthrough" | "tour" | "splat" | "mesh" | "ortho" | "video" | "photos" | "report";

export type ClientChapter = {
  id: string;
  kind: ClientChapterKind;
  title: string;
  posterUrl: string | null;
  href: string;
  capturedAt: string;
};

export type ClientScan = { date: string; chapters: ClientChapter[] };
export type ClientDocument = { id: string; title: string; folder: string; createdAt: string; href: string };
export type ClientQuestion = { id: string; title: string; status: string; href: string };

export type ClientProjectData = {
  project: { id: string; name: string; location: string | null };
  brand: BrandTheme;
  scans: ClientScan[];
  documents: ClientDocument[];
  questions: ClientQuestion[];
  askHref: string | null;
};

const CHAPTER_TITLES: Record<ClientChapterKind, string> = {
  walkthrough: "Walkthrough",
  tour: "360 Tour on plans",
  splat: "3D model",
  mesh: "3D model",
  ortho: "Drone map",
  video: "Video",
  photos: "Photos",
  report: "Report",
};

const fixtureTitle = (title: string | null | undefined) => /housewalk|kitchen|harbor point/i.test(title ?? "");

export function groupChaptersByScan(chapters: ClientChapter[]): ClientScan[] {
  const byDate = new Map<string, ClientChapter[]>();
  for (const c of chapters) {
    const date = c.capturedAt.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), c]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, list]) => ({ date, chapters: list }));
}

export async function loadClientProject(args: {
  projectId: string;
  orgId: string;
  userId: string;
}): Promise<ClientProjectData | null> {
  const { projectId, orgId, userId } = args;
  const { project: scoped } = await getScopedProjectForUser(userId, projectId, "id, name, location, org_id");
  const project = scoped as { id: string; name: string; location: string | null; org_id: string | null } | null;
  if (!project || (project.org_id && project.org_id !== orgId)) return null;

  const admin = createAdminClient();
  const [walksRes, toursRes, twinsRes, pinsRes, foldersRes, themeRes] = await Promise.all([
    admin
      .from("spatial_walkthroughs")
      .select("id, title, captured_at, status")
      .eq("project_id", projectId)
      .eq("org_id", orgId)
      .in("status", ["ready", "published"])
      .order("captured_at", { ascending: false })
      .limit(24),
    admin
      .from("project_tours")
      .select("id, title, viewer_slug, created_at")
      .eq("project_id", projectId)
      .eq("status", "published")
      .not("viewer_slug", "is", null)
      .limit(12),
    admin
      .from("digital_twin_spaces")
      .select("id, title, published_model_id, settings, updated_at")
      .eq("project_id", projectId)
      .not("published_model_id", "is", null)
      .is("deleted_at", null)
      .limit(12),
    admin
      .from("spatial_pins")
      .select("id, label, pin_type, status, visibility, t_seconds, yaw_deg, pitch_deg, walkthrough_id")
      .eq("project_id", projectId)
      .in("visibility", ["client", "public"]),
    admin.from("project_folders").select("id, name").eq("project_id", projectId),
    admin.from("spatial_org_themes").select("*").eq("org_id", orgId).maybeSingle(),
  ]);

  const walks = (walksRes.data ?? []).filter((w) => !fixtureTitle(w.title));
  const clipsRes = walks.length
    ? await admin
        .from("spatial_clips")
        .select("id, walkthrough_id")
        .in("walkthrough_id", walks.map((w) => w.id))
        .eq("status", "ready")
        .order("sort_order")
    : { data: [] as Array<{ id: string; walkthrough_id: string }> };
  const firstClip = new Map<string, string>();
  for (const c of clipsRes.data ?? []) if (!firstClip.has(c.walkthrough_id)) firstClip.set(c.walkthrough_id, c.id);

  const chapters: ClientChapter[] = walks.map((w) => {
    const clip = firstClip.get(w.id);
    return {
      id: `walk:${w.id}`,
      kind: "walkthrough",
      title: CHAPTER_TITLES.walkthrough,
      posterUrl: clip ? `/api/spatial-walkthrough/${w.id}/media?clip=${clip}&kind=hero&policy=client` : null,
      href: `/projects/${projectId}/walkthroughs/${w.id}`,
      capturedAt: w.captured_at,
    };
  });

  for (const t of toursRes.data ?? []) {
    if (fixtureTitle(t.title) || !t.viewer_slug) continue;
    chapters.push({
      id: `tour:${t.id}`,
      kind: "tour",
      title: CHAPTER_TITLES.tour,
      posterUrl: null,
      href: `/tours/view/${t.viewer_slug}`,
      capturedAt: t.created_at,
    });
  }

  const acceptedTwins = (twinsRes.data ?? []).filter((s) => {
    if (fixtureTitle(s.title)) return false;
    const settings = (s.settings as { localQa?: string; qaStatus?: string; humanReviewAccepted?: boolean } | null) ?? {};
    return (settings.qaStatus ?? settings.localQa) === "accepted" && settings.humanReviewAccepted === true;
  });
  const tokensRes = acceptedTwins.length
    ? await admin
        .from("digital_twin_share_tokens")
        .select("space_id, token")
        .in("space_id", acceptedTwins.map((s) => s.id))
        .eq("is_revoked", false)
    : { data: [] as Array<{ space_id: string; token: string }> };
  const tokenBySpace = new Map((tokensRes.data ?? []).map((r) => [r.space_id, r.token]));
  for (const s of acceptedTwins) {
    const token = tokenBySpace.get(s.id);
    if (!token) continue;
    chapters.push({
      id: `splat:${s.id}`,
      kind: "splat",
      title: CHAPTER_TITLES.splat,
      posterUrl: `/api/digital-twin/models/${s.published_model_id}/preview-image`,
      href: `/share/twin/${token}`,
      capturedAt: s.updated_at,
    });
  }

  const pins = pinsRes.data ?? [];
  const pinHref = (p: { id: string; walkthrough_id: string | null; t_seconds: number | null; yaw_deg: number | null; pitch_deg: number | null }) =>
    p.walkthrough_id
      ? `/projects/${projectId}/walkthroughs/${p.walkthrough_id}?pin=${p.id}&t=${p.t_seconds ?? 0}&yaw=${p.yaw_deg ?? 0}&pitch=${p.pitch_deg ?? 0}`
      : `/projects/${projectId}`;
  const questions: ClientQuestion[] = pins
    .filter((p) => p.pin_type === "rfi" || p.pin_type === "note")
    .map((p) => ({ id: p.id, title: p.label ?? "Question", status: p.status ?? "open", href: pinHref(p) }));

  const folders = (foldersRes.data ?? []) as Array<{ id: string; name: string }>;
  let documents: ClientDocument[] = [];
  if (folders.length) {
    const namespace = resolveNamespace(orgId, userId);
    const { data: files } = await admin
      .from("slatedrop_uploads")
      .select("id, file_name, s3_key, created_at")
      .eq("org_id", orgId)
      .eq("status", "active")
      .or(folders.map((f) => `s3_key.like.${escapeLike(`orgs/${namespace}/${f.id}/`)}%`).join(","))
      .order("created_at", { ascending: false })
      .limit(60);
    const folderName = (key: string) => folders.find((f) => key.includes(`/${f.id}/`))?.name ?? "Files";
    documents = (files ?? []).map((f) => ({
      id: f.id,
      title: f.file_name,
      folder: folderName(f.s3_key).replace(/^\d+_/, "").replace(/_/g, " "),
      createdAt: f.created_at,
      href: `/projects/${projectId}/slatedrop`,
    }));
  }

  const brand = resolveBrandTheme({
    org: orgThemeFromRow(themeRes.data as Record<string, unknown> | null),
    snapshot: { showPoweredBy: true, logoOpacity: 0.88 },
    canHidePoweredBy: true,
  });

  return {
    project: { id: project.id, name: project.name, location: project.location },
    brand,
    scans: groupChaptersByScan(chapters),
    documents,
    questions,
    askHref: walks[0] ? `/projects/${projectId}/walkthroughs/${walks[0].id}` : null,
  };
}
