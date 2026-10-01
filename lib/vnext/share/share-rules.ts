import { randomBytes } from "crypto";
import type { VnextExploreData, VnextExploreRepresentation, VnextExploreSourceData } from "@/lib/vnext/explore-types";
import type { VnextVisit } from "@/lib/vnext/history/history-types";
import type { ClientCapabilityId } from "@/lib/vnext/scope/capabilities";
import { canClientSeeCapability, type ClientProjectScope } from "@/lib/vnext/scope/resolve-client-scope";

export const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;
export const SHARE_ROUTE = "/share/project";

const VISUAL_CAPABILITIES = ["reality", "geometry", "pano360", "plans"] as const satisfies readonly ClientCapabilityId[];

export type ShareTarget = "project" | "saved_view";
export type ShareLinkStatus = "active" | "expired" | "revoked";
export type PublicSection = "overview" | "explore" | "history";

export type ShareLinkRecord = {
  id: string;
  token: string;
  projectId: string;
  targetType: ShareTarget;
  savedViewId: string | null;
  label: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  viewCount: number;
  createdAt: string;
};

export type ShareListItem = {
  id: string;
  label: string;
  projectName: string;
  targetLabel: string;
  createdLabel: string;
  expiresLabel: string;
  status: "Active" | "Expired" | "Revoked";
  opens: number;
  url: string;
};

export type ShareViewFacts = {
  projectId: string;
  representation: string;
  capabilityIncluded: boolean;
  published: boolean;
};

export function isShareToken(value: string): boolean {
  return SHARE_TOKEN_RE.test(value);
}

export function newShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sharePath(token: string): string {
  return `${SHARE_ROUTE}/${token}`;
}

export function shareLinkStatus(
  row: { isRevoked: boolean; expiresAt: string | null },
  now: Date,
): ShareLinkStatus {
  if (row.isRevoked) return "revoked";
  if (row.expiresAt && Date.parse(row.expiresAt) <= now.getTime()) return "expired";
  return "active";
}

export function statusWord(status: ShareLinkStatus): ShareListItem["status"] {
  if (status === "expired") return "Expired";
  if (status === "revoked") return "Revoked";
  return "Active";
}

export function formatShareDate(iso: string | null): string {
  if (!iso) return "None";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "None";
  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function parseShareLabel(value: string | null): { ok: true; label: string | null } | { ok: false } {
  const label = (value ?? "").trim();
  if (!label) return { ok: true, label: null };
  if (label.length > 80) return { ok: false };
  return { ok: true, label };
}

export function parseExpiresOn(
  value: string | null,
  now: Date,
): { ok: true; expiresAt: string | null } | { ok: false } {
  const raw = (value ?? "").trim();
  if (!raw) return { ok: true, expiresAt: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { ok: false };
  const expiresAt = `${raw}T23:59:59.999Z`;
  if (Date.parse(expiresAt) <= now.getTime()) return { ok: false };
  return { ok: true, expiresAt };
}

export function publicPortalSections(scope: ClientProjectScope): PublicSection[] {
  const sections: PublicSection[] = ["overview"];
  if (VISUAL_CAPABILITIES.some((id) => canClientSeeCapability(scope, id))) sections.push("explore");
  if (canClientSeeCapability(scope, "history")) sections.push("history");
  return sections;
}

export function assessShareTarget(input: {
  target: string;
  projectAllowed: boolean;
  projectId: string;
  view: ShareViewFacts | null;
}): { ok: true; target: ShareTarget } | { ok: false; status: 400 | 404 | 409; error: string } {
  if (input.target !== "project" && input.target !== "saved_view") {
    return { ok: false, status: 400, error: "Invalid request" };
  }
  if (!input.projectAllowed) return { ok: false, status: 404, error: "Not found" };
  if (input.target === "project") return { ok: true, target: "project" };
  if (!input.view || input.view.projectId !== input.projectId) {
    return { ok: false, status: 404, error: "Not found" };
  }
  if (input.view.representation === "thermal") {
    return { ok: false, status: 409, error: "This view cannot be shared on a project link." };
  }
  if (!input.view.capabilityIncluded) {
    return { ok: false, status: 409, error: "This project does not include that view." };
  }
  if (!input.view.published) {
    return { ok: false, status: 409, error: "Publish this source before sharing it." };
  }
  return { ok: true, target: "saved_view" };
}

export function evidenceIsPublic(input: {
  representation: string;
  capabilityIncluded: boolean;
  published: boolean;
}): boolean {
  if (input.representation === "thermal") return false;
  return input.capabilityIncluded && input.published;
}

export type PublicSourceCheck = {
  shareProjectId: string;
  sourceProjectId: string;
  targetType: ShareTarget;
  savedRepresentation: string | null;
  savedSourceId: string | null;
  representation: VnextExploreRepresentation;
  sourceId: string;
  capabilityIncluded: boolean;
  published: boolean;
};

export function publicSourceAllowed(input: PublicSourceCheck): boolean {
  if (input.sourceProjectId !== input.shareProjectId) return false;
  if (input.representation === "thermal") return false;
  if (!input.capabilityIncluded || !input.published) return false;
  if (input.targetType === "saved_view") {
    return input.savedRepresentation === input.representation && input.savedSourceId === input.sourceId;
  }
  return true;
}

export function retargetPublicUrl(url: string | null, projectId: string, token: string): string | null {
  if (!url) return url;
  const from = `/api/vnext/projects/${projectId}/`;
  if (!url.startsWith(from)) return url;
  return `/api/share/project/${token}/${url.slice(from.length)}`;
}

export function retargetExploreMedia(data: VnextExploreData, token: string): VnextExploreData {
  const next: VnextExploreData = { ...data, overviewHref: sharePath(token) };
  const source = next.activeSourceData;
  if (!source || source.kind === "thermal") {
    return { ...next, activeRepresentation: source?.kind === "thermal" ? null : next.activeRepresentation, activeSourceData: source?.kind === "thermal" ? null : source };
  }
  next.activeSourceData = retargetSource(source, data.projectId, token, next.activeSourceId);
  return next;
}

function retargetSource(
  source: VnextExploreSourceData,
  projectId: string,
  token: string,
  sourceId: string | null,
): VnextExploreSourceData {
  if (source.kind === "reality") {
    return { ...source, modelUrl: retargetPublicUrl(source.modelUrl, projectId, token) ?? source.modelUrl };
  }
  if (source.kind === "geometry" && sourceId) {
    return { ...source, modelUrl: `/api/share/project/${token}/twin-models/${sourceId}/splat` };
  }
  if (source.kind === "360" || source.kind === "plan") {
    return { ...source, imageUrl: retargetPublicUrl(source.imageUrl, projectId, token) ?? source.imageUrl };
  }
  return source;
}

export function lockExploreToSource(
  data: VnextExploreData,
  representation: VnextExploreRepresentation,
  sourceId: string,
): VnextExploreData | null {
  if (data.activeRepresentation !== representation || data.activeSourceId !== sourceId || !data.activeSourceData) {
    return null;
  }
  const listed = data.sourcesByRepresentation[representation]?.filter((source) => source.id === sourceId) ?? [];
  return {
    ...data,
    availableRepresentations: [representation],
    sourcesByRepresentation: { [representation]: listed },
  };
}

export function preparePublicVisits(visits: VnextVisit[], projectId: string, token: string): VnextVisit[] {
  return visits.flatMap((visit) => {
    if (visit.kind === "thermal") return [];
    const sources = visit.sources
      .filter((source) => source.rep !== "thermal")
      .map((source) => ({ ...source, imageHref: retargetPublicUrl(source.imageHref, projectId, token) }));
    const plans = visit.plans.map((plan) => ({
      ...plan,
      imageHref: retargetPublicUrl(plan.imageHref, projectId, token) ?? plan.imageHref,
    }));
    if (sources.length === 0 && plans.length === 0) return [];
    const thumbnailHref = sources.find((source) => source.imageHref)?.imageHref ?? plans[0]?.imageHref ?? null;
    return [{ ...visit, sources, plans, items: [], itemCount: 0, thumbnailHref }];
  });
}
