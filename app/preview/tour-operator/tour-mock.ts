import { publishChecklist } from "@/lib/spatial-tour/publish-checklist";
import type { TourBundle, TourClip } from "@/lib/spatial-tour/types";
import { clampViewIntoCone, parseLookCone } from "@/lib/spatial-tour/look-cone";

/**
 * In-memory stand-in for /api/projects/harness/tour/* so the real operator UI can be
 * exercised without a session. Stills "extract" after 1.5 s. Harness only.
 */
export function createTourMock(opts: { walkthroughId: string; clipId: string; durationS: number; withRoute: boolean }): (url: string, init?: RequestInit) => Response | Promise<Response> | null {
  const clip: TourClip = { id: opts.clipId, durationS: opts.durationS, sortOrder: 0, hasPublicProxy: true, lookCone: null, maskVisible: false, maskCoverage: 0.03 };
  const visit = (id: string, title: string, capturedAt: string) => ({
    walkthroughId: id, title, capturedAt, routeId: null as string | null, clientPublishedAt: null as string | null,
    stillsReviewedAt: null as string | null, privacyReviewedAt: null as string | null, clips: [{ ...clip }],
  });
  const b: TourBundle = {
    route: null, chapters: [], checkpoints: [], marks: [],
    visits: [visit(opts.walkthroughId, "Harness visit A", "2026-09-10T15:00:00Z"), visit("harness-visit-b", "Harness visit B", "2026-09-24T15:00:00Z")],
  };
  let seq = 0;
  const id = (p: string) => `${p}-${++seq}`;
  const createRoute = (name: string, from: string) => {
    b.route = { id: "route-1", projectId: "harness", name, revision: 1, captureNotes: null };
    b.chapters = [{ id: "ch-1", name: "Kitchen", sortOrder: 0, retiredAt: null, replacedBy: null }];
    const v = b.visits.find((x) => x.walkthroughId === from);
    if (v) v.routeId = "route-1";
  };
  if (opts.withRoute) createRoute("HouseWalk ground floor", opts.walkthroughId);

  const json = (body: unknown, status = 200) => Response.json(body, { status });
  return (url, init) => {
    if (!url.includes("/api/projects/harness/tour")) return null;
    const method = init?.method ?? "GET";
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    const path = url.split("/api/projects/harness/tour")[1] ?? "";
    if (method === "GET") return json(b);
    if (path === "" && method === "POST") createRoute(String(body.name), String(body.fromWalkthroughId));
    else if (path === "/chapters") b.chapters.push({ id: id("ch"), name: String(body.name), sortOrder: b.chapters.length, retiredAt: null, replacedBy: null });
    else if (path === "/checkpoints" && method === "POST") {
      b.checkpoints.push({ id: id("cp"), chapterId: String(body.chapterId), label: String(body.label), captureNote: null, sortOrder: b.checkpoints.length, introducedInRevision: 1, retiredAt: null, replacedBy: null });
    } else if (path === "/checkpoints" && method === "PATCH") {
      const cp = b.checkpoints.find((c) => c.id === body.checkpointId);
      if (cp && body.retire) cp.retiredAt = new Date().toISOString();
    } else if (path === "/marks") {
      const v = b.visits.find((x) => x.walkthroughId === body.walkthroughId)!;
      if (v.clientPublishedAt) return json({ error: "Unpublish this visit before changing its checkpoints." }, 409);
      b.marks = b.marks.filter((m) => !(m.checkpointId === body.checkpointId && m.walkthroughId === body.walkthroughId));
      const frame = body.match !== "not_captured";
      const vc = v.clips.find((c) => c.id === body.clipId) ?? v.clips[0];
      if (frame && !vc.lookCone) return json({ error: "Set the published view for this visit before marking it" }, 409);
      const view = frame && vc.lookCone ? clampViewIntoCone(vc.lookCone, Number(body.yaw ?? 0), Number(body.pitch ?? 0)) : { yaw: 0, pitch: 0 };
      const m: TourBundle["marks"][number] = {
        id: id("mark"), checkpointId: String(body.checkpointId), walkthroughId: String(body.walkthroughId),
        clipId: frame ? String(body.clipId) : null, tSeconds: frame ? Number(body.t) : null, yawDeg: view.yaw, pitchDeg: view.pitch,
        match: body.match as TourBundle["marks"][number]["match"], stillKey: null, stillStatus: frame ? "queued" : "none", stillError: null, stillBlackFraction: null,
      };
      b.marks.push(m);
      v.stillsReviewedAt = null;
      v.privacyReviewedAt = null;
      if (frame) setTimeout(() => { m.stillStatus = "ready"; m.stillKey = "harness"; m.stillBlackFraction = 0; }, 1500);
    } else if (path.startsWith("/visits/")) {
      const v = b.visits.find((x) => x.walkthroughId === path.split("/")[2])!;
      const now = new Date().toISOString();
      if (body.action === "attach") v.routeId = "route-1";
      if (body.action === "look-cone") {
        const c = v.clips.find((x) => x.id === body.clipId);
        if (c) c.lookCone = parseLookCone(body.cone);
        v.stillsReviewedAt = null;
        v.privacyReviewedAt = null;
      }
      if (body.action === "review-stills") v.stillsReviewedAt = now;
      if (body.action === "review-privacy") v.privacyReviewedAt = now;
      if (body.action === "unpublish") v.clientPublishedAt = null;
      if (body.action === "publish") {
        const c = publishChecklist({ visit: v, checkpoints: b.checkpoints, marks: b.marks });
        if (!c.canPublish) return json({ error: "Checklist incomplete", items: c.items }, 409);
        v.clientPublishedAt = now;
      }
    }
    return json(b);
  };
}
