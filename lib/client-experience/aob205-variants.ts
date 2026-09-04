/**
 * Preview variants of the AOB205 experience for visual QA. Every variant goes
 * through Cursor's capability resolver and brand resolver — the same gates a
 * real portal load uses — so the screenshots exercise production contracts.
 *
 *   state:  A walk only · B 360 only · C walk + 360 · D walk + SIMULATED accepted twin · E rich (default)
 *   brand:  slate (no client) · client (paid default) · whitelabel
 */
import { defaultPaidBrand, resolveProjectBrand, type ProjectBrand } from "../spatial-experience/brand";
import { resolveProjectCapabilities, type ArtifactGate, type CapabilityId } from "../spatial-experience/capabilities";
import { AOB205_KNOWN_SEGMENTS } from "../spatial-experience/trajectory";
import { A, AM, PM, PROXY_DURATION_S, PROXY_OFFSET_S, a803Doc, items, stations, waypoints } from "./aob205-fixture";
import type { ProjectExperience, WalkthroughClip } from "./types";

export type LayoutState = "A" | "B" | "C" | "D" | "E";
export type BrandState = "slate" | "client" | "whitelabel";
export type VariantQuery = { state?: string | null; brand?: string | null };

const LIVE: ArtifactGate = { exists: true, published: true, entitled: true };
/** The real AOB205 Gaussian: exists and is published, but QA says candidate. Clients never see it. */
const AOB205_TWIN_GATE: ArtifactGate = { ...LIVE, qaStatus: "candidate", humanReviewAccepted: false };
const SIMULATED_ACCEPTED_TWIN: ArtifactGate = { ...LIVE, qaStatus: "accepted", humanReviewAccepted: true };

function gatesFor(state: LayoutState): Partial<Record<CapabilityId, ArtifactGate>> {
  switch (state) {
    case "A": return { walkthrough: LIVE, questions: LIVE };
    case "B": return { stations: LIVE, questions: LIVE };
    case "C": return { walkthrough: LIVE, stations: LIVE, history: LIVE, questions: LIVE };
    case "D": return { walkthrough: LIVE, twin: SIMULATED_ACCEPTED_TWIN, plan: { ...LIVE, rasterReady: true }, items: LIVE, questions: LIVE };
    default:
      return {
        walkthrough: LIVE, stations: LIVE, plan: { ...LIVE, rasterReady: true }, twin: AOB205_TWIN_GATE,
        documents: LIVE, history: LIVE, items: LIVE, questions: LIVE,
      };
  }
}

function brandFor(kind: BrandState): ProjectBrand {
  if (kind === "slate") return defaultPaidBrand();
  const client = { clientLogoUrl: `${A}/client-logo.svg`, clientDisplayName: "Sonoran Ridge Construction", accentColor: "#2F6FE4" };
  return resolveProjectBrand(kind === "whitelabel" ? { ...client, whiteLabel: true, poweredBySlate360: true } : client);
}

/** Recorded-path segments mapped onto the 45 s proxy. The known break stays a break. */
export const proxySegments = AOB205_KNOWN_SEGMENTS
  .map((s) => ({ id: s.id, t0: Math.max(0, s.t0 - PROXY_OFFSET_S), t1: Math.min(PROXY_DURATION_S, s.t1 - PROXY_OFFSET_S) }))
  .filter((s) => s.t1 > s.t0);

const walkthrough: WalkthroughClip = {
  id: "clip-107", visitId: "v-am",
  videoUrl: `${A}/walk-proxy.mp4`, posterUrl: `${A}/walk-poster.jpg`,
  durationS: PROXY_DURATION_S, waypoints, spaces: ["Entry", "Seating", "Instructor area"], segments: proxySegments,
};

export function experienceFor(q: VariantQuery = {}): ProjectExperience {
  const state = (["A", "B", "C", "D", "E"].includes(q.state ?? "") ? q.state : "E") as LayoutState;
  const brandKind = (["slate", "client", "whitelabel"].includes(q.brand ?? "") ? q.brand : "client") as BrandState;
  const caps = resolveProjectCapabilities(gatesFor(state));
  const suffix = (() => { const p = new URLSearchParams(); if (state !== "E") p.set("state", state); if (brandKind !== "client") p.set("brand", brandKind); const s = p.toString(); return s ? `?${s}` : ""; })();
  const brand = brandFor(brandKind);
  const withStations = caps.stations;
  const visits = [
    { id: "v-pm", capturedAt: PM, label: "Afternoon documentation", modalities: ["stations" as const], thumbUrl: `${A}/stations/s09-thumb.jpg` },
    { id: "v-am", capturedAt: AM, label: "Morning walkthrough + documentation", modalities: ["walkthrough" as const, "stations" as const], thumbUrl: `${A}/stations/s03-thumb.jpg` },
  ].filter((v) => (caps.history ? true : v.id === "v-am"));

  return {
    brand,
    capabilities: caps,
    project: { name: "AOB 205 DSL Classroom TI", code: "AOB205", location: "4873 West Verde Mall, Glendale, AZ", coverUrl: `${A}/hero.jpg` },
    visits,
    latestVisitId: visits[0]?.id ?? "v-am",
    plan: caps.plan ? { id: "a803", title: "Enlarged Furniture Plan", sheetNumber: "A803", imageUrl: `${A}/plan-a803.png`, width: 2600, height: 1858, focus: { u0: 0.531, v0: 0.226, u1: 0.885, v1: 0.926 }, pdfUrl: `${A}/A803.pdf` } : null,
    walkthrough: caps.walkthrough ? walkthrough : null,
    twin: caps.twin ? { id: "twin-sim", visitId: "v-am", label: "Reality twin — classroom", splatUrl: `${A}/twin-asset`, simulated: true } : null,
    stations: withStations ? stations.filter((s) => (caps.history ? true : s.visitId === "v-am")) : [],
    items: caps.items ? items : [],
    documents: caps.documents
      ? [
          { ...a803Doc, refCount: 2, sheetId: "a803" },
          { id: "d-0305", title: "Floor Plan — General Notes", kind: "pdf", url: "#", thumbUrl: `${A}/doc-918a0305.jpg`, meta: "918A0305 · Drawing Studio", refCount: 0 },
          { id: "d-0025", title: "Site Utilities Plan", kind: "pdf", url: "#", thumbUrl: `${A}/doc-918a0025.jpg`, meta: "918A0025", refCount: 0 },
        ]
      : [],
    activity: caps.items
      ? [
          { id: "ac1", at: "2026-08-19T07:30:00-07:00", summary: "Projector note marked resolved", itemId: "i-103" },
          { id: "ac6", at: "2026-08-18T14:02:00-07:00", summary: "Floor box question answered", itemId: "i-104" },
          { id: "ac2", at: "2026-08-18T11:05:00-07:00", summary: "Reply on credenza clearance", itemId: "i-101" },
          { id: "ac3", at: "2026-08-18T09:02:00-07:00", summary: "Railing issue opened at northeast entry", itemId: "i-102" },
          { id: "ac4", at: "2026-08-17T16:00:00-07:00", summary: "Afternoon documentation published (4 stations)" },
        ]
      : [],
    shareUrl: null,
    basePath: A,
    linkSuffix: suffix,
  };
}

export const aob205Experience = experienceFor();
