import type { ClientCapabilityId } from "@/lib/vnext/scope/capabilities";

/** Service capabilities the owner can include. Portal sections are separate. */
export const OWNER_SERVICE_IDS = ["reality", "geometry", "pano360", "plans", "thermal"] as const;

export type OwnerServiceId = (typeof OWNER_SERVICE_IDS)[number];

/**
 * Home rows are explicit work. Later slices can add a kind, such as a real
 * capture request, without changing the row shape. Do not infer a kind from age.
 */
export type OwnerAttentionKind = "processing_failed";

export type OwnerAttentionItem = {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  kind: OwnerAttentionKind;
  title: string;
  destinationHref: string;
  occurredAt: string | null;
};

export type OwnerServiceLine = {
  id: OwnerServiceId;
  label: string;
  included: true;
  internal: boolean;
  clientVisible: boolean;
};

export type OwnerProjectSummary = {
  id: string;
  name: string;
  clientName: string | null;
  location: string | null;
  thumbnailUrl: string | null;
  documentedAt: string | null;
  archived: boolean;
  includedLabel: string;
  visibleLabel: string;
  serviceLines: OwnerServiceLine[];
  attentionTitle: string | null;
  projectHref: string;
  detailHref: string;
};

export type OwnerClientSummary = {
  key: string;
  name: string;
  projectCount: number;
  recentProjectName: string;
  recentAt: string | null;
  href: string;
};

export type OwnerFailureKind = "capture" | "plan" | "thermal";

export type OwnerFailureFact = {
  id: string;
  projectId: string;
  kind: OwnerFailureKind;
  title: string;
  occurredAt: string | null;
};

export type OwnerPresence = Record<OwnerServiceId, boolean>;

export type OwnerProjectFact = {
  id: string;
  name: string;
  status: string | null;
  archived: boolean;
  clientName: string | null;
  location: string | null;
  thumbnailUrl: string | null;
  documentedAt: string | null;
  included: readonly ClientCapabilityId[];
  /** A renderable source exists inside the project, before client inclusion. */
  internal: OwnerPresence;
  /**
   * Client-visible under the existing scope and publication rules.
   * Thermal is visible only when included and a published capture can render.
   */
  clientVisible: OwnerPresence;
};

export function emptyPresence(): OwnerPresence {
  return { reality: false, geometry: false, pano360: false, plans: false, thermal: false };
}
