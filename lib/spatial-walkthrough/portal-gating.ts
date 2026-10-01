/**
 * Fail-closed client portal gating. A section shows only when its data exists AND
 * its deliverable is packaged for this share. Everything else is removed from the
 * payload, not just hidden, so no chrome, count or deep link can point at it.
 */
import { isPackaged, type PackageDeliverable } from "@/lib/spatial-experience/portal-package";
import type { PortalLandingData } from "./portal-fixtures";

export type PortalCaps = NonNullable<PortalLandingData["capabilities"]>;
export type PortalSection = "overview" | "reality" | "plan" | "history" | "documents" | "items";

export const NO_CAPS: PortalCaps = {
  walkthrough: false,
  stations: false,
  plan: false,
  twin: false,
  aerial: false,
  documents: false,
  history: false,
  items: false,
};

export function gatePortalCapabilities(dataCaps: PortalCaps, allowed: Set<PackageDeliverable> | null): PortalCaps {
  const has = (id: PackageDeliverable) => isPackaged(allowed, id);
  return {
    walkthrough: dataCaps.walkthrough && (has("walkthrough") || has("tour")),
    stations: dataCaps.stations && has("stations"),
    twin: dataCaps.twin && has("twin"),
    // The portal Plan page has no plan viewer yet (it only explained what was missing).
    plan: false,
    aerial: false,
    documents: dataCaps.documents && has("evidence"),
    // The old History rail linked every visit to the same walk and 404'd other visits'
    // posters. Visits return through the Directed Tour timeline.
    history: false,
    items: dataCaps.items && has("issues"),
  };
}

/** Sections in nav order. Overview is always present; nothing shows when caps are missing. */
export function portalSections(caps: PortalCaps | undefined): PortalSection[] {
  const c = caps ?? NO_CAPS;
  const out: PortalSection[] = ["overview"];
  if (c.walkthrough || c.stations || c.twin || c.aerial) out.push("reality");
  if (c.plan) out.push("plan");
  if (c.history) out.push("history");
  if (c.documents) out.push("documents");
  if (c.items) out.push("items");
  return out;
}

export function sectionAllowed(data: PortalLandingData, section: PortalSection): boolean {
  return portalSections(data.capabilities).includes(section);
}

/** Strip every field a disabled capability would otherwise surface. */
export function applyPortalCapabilities(data: PortalLandingData, caps: PortalCaps): PortalLandingData {
  const reality = data.reality ?? { walkthroughHref: null, twinHref: null, stationsHref: null, aerialHref: null };
  return {
    ...data,
    hero: caps.walkthrough ? data.hero : null,
    history: caps.history ? data.history : [],
    compareAvailable: caps.history && data.compareAvailable,
    shareHref: caps.walkthrough ? data.shareHref : null,
    captureTree: caps.walkthrough ? data.captureTree : [],
    // Walkthrough links and poster thumbs only resolve when the walkthrough is served.
    documents: caps.documents
      ? data.documents.map((d) => (caps.walkthrough ? d : { ...d, locatorHref: null, thumbUrl: null }))
      : [],
    items: caps.items ? data.items.map((i) => (caps.walkthrough ? i : { ...i, locatorHref: null })) : [],
    activity: caps.items ? data.activity : [],
    attention: caps.items ? data.attention : { open: 0, urgent: 0, questions: 0 },
    reality: {
      walkthroughHref: caps.walkthrough ? reality.walkthroughHref : null,
      twinHref: caps.twin ? reality.twinHref : null,
      stationsHref: caps.stations ? reality.stationsHref : null,
      aerialHref: caps.aerial ? reality.aerialHref : null,
    },
    planHref: caps.plan ? data.planHref ?? null : null,
    capabilities: caps,
  };
}

/** Client name for the scan/360 section, from what is actually shared (vNext product language). */
export function realitySectionLabel(caps: PortalCaps | undefined): string {
  const c = caps ?? NO_CAPS;
  const has360 = c.walkthrough || c.stations || c.aerial;
  if (c.twin && has360) return "3D Scan & 360";
  if (c.twin) return "3D Scan";
  return "360 / Walkthrough";
}

