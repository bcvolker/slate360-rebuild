import type {
  VnextExploreItemFocus,
  VnextItemLocator,
  VnextSpatialAction,
} from "./item-types";

export type LocatorPinEvidence = {
  itemId: string | null;
  projectId: string | null;
  planSheetId: string | null;
  xPct: number | string | null;
  yPct: number | string | null;
};

export type LocatorEvidence = {
  itemId: string;
  projectId: string;
  itemType: string;
  hasRenderableImage: boolean;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  sessionId: string | null;
  sessionInProject: boolean;
  capturedAt: string | null;
  pins: LocatorPinEvidence[];
  renderableSheetIds: ReadonlySet<string>;
  publishedPanoramaIds?: ReadonlySet<string>;
};

function percent(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function coord(value: number | null | undefined, limit: number): number | null {
  if (value == null || !Number.isFinite(value) || Math.abs(value) > limit) return null;
  return value;
}

/**
 * Proven location contexts only.
 * Plan: site_walk_pins.x_pct/y_pct on a renderable sheet in this project.
 * Panorama: the item itself is a photo_360 with an image — no yaw/pitch is invented.
 * Reality/Geometry XYZ: not derived. digital_twin_pins has no item foreign key.
 * Geo: latitude + longitude. Visit: session that belongs to this project.
 */
export function deriveItemLocators(evidence: LocatorEvidence): VnextItemLocator[] {
  const locators: VnextItemLocator[] = [];

  const planPins = evidence.pins
    .filter((pin) => pin.itemId === evidence.itemId && pin.projectId === evidence.projectId)
    .map((pin) => {
      const xPct = percent(pin.xPct);
      const yPct = percent(pin.yPct);
      if (!pin.planSheetId || !evidence.renderableSheetIds.has(pin.planSheetId)) return null;
      if (xPct == null || yPct == null) return null;
      return { sheetId: pin.planSheetId, xPct, yPct };
    })
    .filter((pin): pin is { sheetId: string; xPct: number; yPct: number } => pin != null)
    .sort((a, b) => a.sheetId.localeCompare(b.sheetId) || a.xPct - b.xPct || a.yPct - b.yPct);

  for (const pin of planPins) {
    locators.push({ kind: "plan", sheetId: pin.sheetId, xPct: pin.xPct, yPct: pin.yPct, precise: true });
  }

  if (
    evidence.itemType === "photo_360" &&
    evidence.hasRenderableImage &&
    (!evidence.publishedPanoramaIds || evidence.publishedPanoramaIds.has(evidence.itemId))
  ) {
    locators.push({ kind: "panorama", sourceId: evidence.itemId, precise: false });
  }

  const latitude = coord(evidence.latitude, 90);
  const longitude = coord(evidence.longitude, 180);
  if (latitude != null && longitude != null) {
    locators.push({
      kind: "geo",
      latitude,
      longitude,
      locationLabel: evidence.locationLabel,
    });
  }

  if (evidence.sessionInProject && evidence.sessionId && evidence.capturedAt) {
    const ms = Date.parse(evidence.capturedAt);
    if (Number.isFinite(ms)) {
      locators.push({ kind: "visit", sessionId: evidence.sessionId, capturedAt: evidence.capturedAt });
    }
  }

  return locators;
}

/** Plan marker wins over "open this panorama". Geo and visit never pretend to be a camera jump. */
export function bestSpatialAction(locators: VnextItemLocator[]): VnextSpatialAction | null {
  const plan = locators.find((locator) => locator.kind === "plan");
  if (plan && plan.kind === "plan") {
    return { representation: "plan", sourceId: plan.sheetId, precise: true };
  }
  const panorama = locators.find((locator) => locator.kind === "panorama");
  if (panorama && panorama.kind === "panorama") {
    return { representation: "360", sourceId: panorama.sourceId, precise: false };
  }
  return null;
}

export function buildExploreItemFocus(args: {
  itemId: string;
  title: string;
  statusLabel: string;
  locationLabel: string | null;
  dateLabel: string;
  detailHref: string;
  locators: VnextItemLocator[];
  activeRepresentation: string | null;
  activeSourceId: string | null;
}): VnextExploreItemFocus {
  const planOnSheet = args.locators.find(
    (locator) => locator.kind === "plan" && locator.sheetId === args.activeSourceId,
  );
  const anyPlan = args.locators.some((locator) => locator.kind === "plan");
  const panorama = args.locators.find((locator) => locator.kind === "panorama");

  let planMarker: VnextExploreItemFocus["planMarker"] = null;
  let opensPanorama = false;
  let contextNote: string | null = null;

  if (args.activeRepresentation === "plan" && planOnSheet && planOnSheet.kind === "plan") {
    planMarker = {
      xPct: planOnSheet.xPct,
      yPct: planOnSheet.yPct,
      label: `Location of ${args.title}`,
    };
    contextNote = "Shown on this sheet";
  } else if (args.activeRepresentation === "plan" && anyPlan) {
    contextNote = "Marked on another sheet";
  } else if (anyPlan) {
    contextNote = "Marked on a plan";
  }

  if (
    args.activeRepresentation === "360" &&
    panorama &&
    panorama.kind === "panorama" &&
    panorama.sourceId === args.activeSourceId
  ) {
    opensPanorama = true;
    contextNote = "This panorama. Direction was not recorded.";
  } else if (args.activeRepresentation === "360" && panorama) {
    contextNote = "Documented on another panorama";
  }

  return {
    itemId: args.itemId,
    title: args.title,
    statusLabel: args.statusLabel,
    locationLabel: args.locationLabel,
    dateLabel: args.dateLabel,
    detailHref: args.detailHref,
    planMarker,
    opensPanorama,
    contextNote,
  };
}
