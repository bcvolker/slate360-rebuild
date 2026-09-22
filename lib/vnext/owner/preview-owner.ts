import { isClientCapabilityId, type ClientCapabilityId } from "@/lib/vnext/scope/capabilities";
import { buildOwnerAttention } from "./attention";
import { applyGroupedClientNames, groupOwnerClients } from "./clients";
import type { OwnerFailureFact, OwnerPresence, OwnerProjectFact } from "./owner-types";
import { emptyPresence } from "./owner-types";
import { summarizeOwnerProject, summarizeOwnerProjects } from "./project-summary";

export function previewProjectDetail(id: string, includedParam: string | null) {
  const source = PREVIEW_OWNER_FACTS.find((project) => project.id === id);
  if (!source) return null;
  const included = previewIncluded(includedParam, source.included);
  const next: OwnerProjectFact = {
    ...source,
    included,
    clientVisible: {
      reality: source.internal.reality && included.includes("reality"),
      geometry: source.internal.geometry && included.includes("geometry"),
      pano360: source.internal.pano360 && included.includes("pano360"),
      plans: source.internal.plans && included.includes("plans"),
      thermal: source.clientVisible.thermal && included.includes("thermal"),
    },
  };
  const project = summarizeOwnerProject(next, PREVIEW_OWNER_FAILURES.filter((failure) => failure.projectId === id));
  return {
    project: { ...project, detailHref: `/preview/vnext/owner/projects/${id}` },
    included,
  };
}

const portal = ["items", "documents", "history", "compare"] as const;

function presence(partial: Partial<OwnerPresence>): OwnerPresence {
  return { ...emptyPresence(), ...partial };
}

function fact(input: Omit<OwnerProjectFact, "internal" | "clientVisible"> & {
  internal?: Partial<OwnerPresence>;
  clientVisible?: Partial<OwnerPresence>;
}): OwnerProjectFact {
  return {
    ...input,
    internal: presence(input.internal ?? {}),
    clientVisible: presence(input.clientVisible ?? {}),
  };
}

export const PREVIEW_OWNER_FACTS: OwnerProjectFact[] = [
  fact({
    id: "payne",
    name: "Payne Hall",
    status: "active",
    archived: false,
    clientName: "UCL",
    location: "Cambridge",
    thumbnailUrl: "/vnext-preview/reality.svg",
    documentedAt: "2026-09-18T15:00:00.000Z",
    included: ["reality", "pano360", "plans", ...portal],
    internal: { reality: true, plans: true },
    clientVisible: { reality: true, plans: true },
  }),
  fact({
    id: "library",
    name: "Science Library",
    status: "active",
    archived: false,
    clientName: "ucl",
    location: "Cambridge",
    thumbnailUrl: null,
    documentedAt: "2026-09-12T12:00:00.000Z",
    included: ["reality", ...portal],
    internal: { reality: true },
    clientVisible: { reality: true },
  }),
  fact({
    id: "smith",
    name: "Smith Residence",
    status: "active",
    archived: false,
    clientName: "Smith Family",
    location: "Oakland",
    thumbnailUrl: null,
    documentedAt: "2026-09-20T12:00:00.000Z",
    included: ["reality", ...portal],
    internal: { reality: true },
    clientVisible: { reality: true },
  }),
  fact({
    id: "harbor",
    name: "Harbor Street",
    status: "active",
    archived: false,
    clientName: "Harbor Co",
    location: "Alameda",
    thumbnailUrl: null,
    documentedAt: "2026-08-02T12:00:00.000Z",
    included: [...portal],
    internal: {},
    clientVisible: {},
  }),
  fact({
    id: "north",
    name: "North Clinic",
    status: "active",
    archived: false,
    clientName: "North Clinic",
    location: "Berkeley",
    thumbnailUrl: null,
    documentedAt: "2026-09-01T12:00:00.000Z",
    included: ["reality", "thermal", ...portal],
    internal: { reality: true, thermal: true },
    clientVisible: { reality: true, thermal: false },
  }),
  fact({
    id: "abc",
    name: "Warehouse A",
    status: "active",
    archived: false,
    clientName: "ABC Construction",
    location: "Richmond",
    thumbnailUrl: null,
    documentedAt: "2026-07-01T12:00:00.000Z",
    included: ["plans", ...portal],
    internal: { plans: true },
    clientVisible: { plans: true },
  }),
  fact({
    id: "abc-llc",
    name: "Warehouse B",
    status: "active",
    archived: false,
    clientName: "ABC Construction LLC",
    location: "Richmond",
    thumbnailUrl: null,
    documentedAt: "2026-07-04T12:00:00.000Z",
    included: ["plans", ...portal],
    internal: { plans: true },
    clientVisible: { plans: true },
  }),
];

export const PREVIEW_OWNER_FAILURES: OwnerFailureFact[] = [
  {
    id: "cap-smith",
    projectId: "smith",
    kind: "capture",
    title: "Room 213",
    occurredAt: "2026-09-20T18:00:00.000Z",
  },
];

export function previewOwnerWorkspace(
  baseClients = "/preview/vnext/owner/clients",
  failures: readonly OwnerFailureFact[] = PREVIEW_OWNER_FAILURES,
) {
  const listed = summarizeOwnerProjects(PREVIEW_OWNER_FACTS, failures).map((project) => ({
    ...project,
    detailHref: `/preview/vnext/owner/projects/${project.id}`,
  }));
  const clients = groupOwnerClients(PREVIEW_OWNER_FACTS, baseClients);
  return {
    projects: applyGroupedClientNames(listed, clients),
    attention: buildOwnerAttention(PREVIEW_OWNER_FACTS, failures),
    clients,
  };
}

export function previewIncluded(value: string | null, fallback: readonly ClientCapabilityId[]): ClientCapabilityId[] {
  if (!value) return [...fallback];
  return value.split(",").filter(isClientCapabilityId);
}
