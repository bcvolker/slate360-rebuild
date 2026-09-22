import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { vnextExploreHref } from "@/lib/vnext/explore/build-explore-href";
import { visitPlanAnchors } from "@/lib/vnext/plans/visit-plan-anchor";
import { formatPlainDate } from "@/lib/vnext/overview-visit";
import type { VnextVisit } from "./history-types";
import { isClientHistorySession, siteWalkOccurredAt, thermalOccurredAt, twinOccurredAt } from "./history-rules";

export type HistoryBuildInput = {
  projectId: string;
  exploreBase: string;
  itemsBase: string;
  sessions: Array<{
    id: string;
    projectId: string | null;
    title: string | null;
    status: string | null;
    completedAt: string | null;
    startedAt: string | null;
    createdOfflineAt: string | null;
    createdAt: string | null;
  }>;
  items: Array<{
    id: string;
    projectId: string | null;
    sessionId: string | null;
    itemType: string | null;
    title: string | null;
    capturedAt: string | null;
    deleted: boolean;
  }>;
  spaces: Array<{ id: string; projectId: string | null; archived: boolean; deleted: boolean }>;
  captures: Array<{
    id: string;
    projectId: string | null;
    title: string | null;
    uploadedAt: string | null;
    createdAt: string | null;
    deleted: boolean;
  }>;
  models: Array<{
    id: string;
    spaceId: string;
    captureId: string | null;
    format: string;
    storageKey: string;
    title: string | null;
    status: string | null;
    deleted: boolean;
    createdAt: string | null;
    hasPreview: boolean;
    georeferenceStatus: string | null;
  }>;
  thermals: Array<{
    id: string;
    projectId: string | null;
    name: string | null;
    createdAt: string | null;
    deleted: boolean;
    available: boolean;
    earliestCaptureAt: string | null;
  }>;
  sheets: Array<{ id: string; projectId: string; planSetId: string; label: string; revisionLabel: string | null; renderable: boolean }>;
  sessionLinks: Array<{ sessionId: string; planSheetId: string }>;
  pins: Array<{ sessionId: string | null; planSheetId: string | null; projectId: string | null; xPct: number; yPct: number }>;
};

export function assembleProjectHistory(input: HistoryBuildInput): VnextVisit[] {
  const visits: VnextVisit[] = [];
  const site = siteVisits(input);
  visits.push(...site);
  visits.push(...orphanPanos(input, new Set(site.map((visit) => visit.id.replace(/^session-/, "")))));
  visits.push(...twinVisits(input));
  visits.push(...thermalVisits(input));
  return visits
    .filter((visit) => visit.dateLabel.length > 0)
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || b.id.localeCompare(a.id));
}

function siteVisits(input: HistoryBuildInput): VnextVisit[] {
  const anchors = visitPlanAnchors(
    input.projectId,
    input.sheets.map((sheet) => ({ id: sheet.id, planSetId: sheet.planSetId, projectId: sheet.projectId })),
    input.sessionLinks,
    input.pins,
  );
  const sheetsById = new Map(input.sheets.filter((sheet) => sheet.renderable && sheet.projectId === input.projectId).map((sheet) => [sheet.id, sheet]));
  return input.sessions.flatMap((session) => {
    if (session.projectId !== input.projectId || !isClientHistorySession(session.status)) return [];
    const occurredAt = siteWalkOccurredAt(session);
    const dateLabel = formatPlainDate(occurredAt);
    if (!occurredAt || !dateLabel) return [];
    const liveItems = input.items.filter((item) => !item.deleted && item.projectId === input.projectId && item.sessionId === session.id);
    const panos = liveItems.filter((item) => item.itemType === "photo_360");
    const plans = anchors
      .filter((anchor) => anchor.sessionId === session.id)
      .map((anchor) => sheetsById.get(anchor.planSheetId))
      .filter((sheet): sheet is NonNullable<typeof sheet> => Boolean(sheet))
      .map((sheet) => ({
        sheetId: sheet.id,
        sheetLabel: sheet.label,
        revisionLabel: sheet.revisionLabel,
        exploreHref: vnextExploreHref(input.exploreBase, { rep: "plan", source: sheet.id }),
        imageHref: `/api/vnext/projects/${input.projectId}/plan-sheets/${sheet.id}/image`,
      }));
    const sources = [
      ...panos.map((item) => ({
        rep: "360" as const,
        label: item.title?.trim() || "360 photo",
        sourceId: item.id,
        exploreHref: vnextExploreHref(input.exploreBase, { rep: "360", source: item.id }),
        imageHref: `/api/vnext/projects/${input.projectId}/items/${item.id}/image`,
      })),
      ...plans.map((plan) => ({
        rep: "plan" as const,
        label: plan.sheetLabel,
        sourceId: plan.sheetId,
        exploreHref: plan.exploreHref,
        imageHref: plan.imageHref,
      })),
    ];
    return [{
      id: `session-${session.id}`,
      occurredAt,
      dateLabel,
      title: session.title?.trim() || "Site documentation",
      kind: "site" as const,
      kindLabel: "Site documentation",
      sources,
      plans,
      items: liveItems.slice(0, 8).map((item) => ({
        id: item.id,
        title: item.title?.trim() || "Item",
        href: `${input.itemsBase}/${item.id}`,
      })),
      itemCount: liveItems.length,
      thumbnailHref: sources.find((source) => source.rep === "360")?.imageHref ?? plans[0]?.imageHref ?? null,
      frame: null,
    }];
  });
}

function orphanPanos(input: HistoryBuildInput, coveredSessions: Set<string>): VnextVisit[] {
  return input.items.flatMap((item) => {
    if (item.deleted || item.projectId !== input.projectId || item.itemType !== "photo_360") return [];
    if (item.sessionId && coveredSessions.has(item.sessionId)) return [];
    const dateLabel = formatPlainDate(item.capturedAt);
    if (!item.capturedAt || !dateLabel) return [];
    const imageHref = `/api/vnext/projects/${input.projectId}/items/${item.id}/image`;
    return [{
      id: `pano-${item.id}`,
      occurredAt: item.capturedAt,
      dateLabel,
      title: item.title?.trim() || "360 photo",
      kind: "pano" as const,
      kindLabel: "360 photo",
      sources: [{
        rep: "360" as const,
        label: item.title?.trim() || "360 photo",
        sourceId: item.id,
        exploreHref: vnextExploreHref(input.exploreBase, { rep: "360", source: item.id }),
        imageHref,
      }],
      plans: [],
      items: [],
      itemCount: 0,
      thumbnailHref: imageHref,
      frame: null,
    }];
  });
}

function twinVisits(input: HistoryBuildInput): VnextVisit[] {
  const spaces = new Map(
    input.spaces.filter((space) => space.projectId === input.projectId && !space.deleted && !space.archived).map((space) => [space.id, space]),
  );
  const captures = new Map(
    input.captures.filter((capture) => capture.projectId === input.projectId && !capture.deleted).map((capture) => [capture.id, capture]),
  );
  const ready = input.models.filter((model) => {
    if (model.deleted || model.status !== "ready") return false;
    if (!spaces.has(model.spaceId)) return false;
    const kind = resolveTwinViewerKind(model.format, model.storageKey);
    return kind === "splat" || kind === "model";
  });
  const groups = new Map<string, typeof ready>();
  for (const model of ready) {
    const key = model.captureId && captures.has(model.captureId) ? `capture-${model.captureId}` : `model-${model.id}`;
    groups.set(key, [...(groups.get(key) ?? []), model]);
  }
  return [...groups.entries()].flatMap(([id, models]) => {
    const capture = models[0].captureId ? captures.get(models[0].captureId) ?? null : null;
    if (models[0].captureId && !capture) return [];
    const occurredAt = twinOccurredAt(capture, models[0].createdAt);
    const dateLabel = formatPlainDate(occurredAt);
    if (!occurredAt || !dateLabel) return [];
    const sources = models.map((model) => {
      const kind = resolveTwinViewerKind(model.format, model.storageKey);
      const rep = kind === "splat" ? "reality" as const : "geometry" as const;
      return {
        rep,
        label: model.title?.trim() || (rep === "reality" ? "Reality scan" : "Geometry"),
        sourceId: model.id,
        exploreHref: vnextExploreHref(input.exploreBase, { rep, source: model.id }),
        imageHref: model.hasPreview ? `/api/vnext/projects/${input.projectId}/twin-models/${model.id}/preview-image` : null,
      };
    });
    const reality = models.find((model) => resolveTwinViewerKind(model.format, model.storageKey) === "splat") ?? null;
    return [{
      id,
      occurredAt,
      dateLabel,
      title: capture?.title?.trim() || sources[0].label,
      kind: "reality" as const,
      kindLabel: reality ? "Reality scan" : "Geometry",
      sources,
      plans: [],
      items: [],
      itemCount: 0,
      thumbnailHref: sources.find((source) => source.imageHref)?.imageHref ?? null,
      frame: reality
        ? { spaceId: reality.spaceId, modelId: reality.id, georeferenceStatus: reality.georeferenceStatus }
        : null,
    }];
  });
}

function thermalVisits(input: HistoryBuildInput): VnextVisit[] {
  return input.thermals.flatMap((session) => {
    if (session.projectId !== input.projectId || session.deleted || !session.available) return [];
    const occurredAt = thermalOccurredAt(session.earliestCaptureAt, session.createdAt);
    const dateLabel = formatPlainDate(occurredAt);
    if (!occurredAt || !dateLabel) return [];
    return [{
      id: `thermal-${session.id}`,
      occurredAt,
      dateLabel,
      title: session.name?.trim() || "Thermal scan",
      kind: "thermal" as const,
      kindLabel: "Thermal scan",
      sources: [{
        rep: "thermal" as const,
        label: session.name?.trim() || "Thermal scan",
        sourceId: session.id,
        exploreHref: vnextExploreHref(input.exploreBase, { rep: "thermal", source: session.id }),
        imageHref: null,
      }],
      plans: [],
      items: [],
      itemCount: 0,
      thumbnailHref: null,
      frame: null,
    }];
  });
}
