import { resolveProjectLocation } from "../projects/location";
import { vnextProjectHref } from "./nav";
import {
  formatDocumentedDate,
  pickLatestIso,
  resolveProjectHero,
  resolveRepresentations,
  satelliteMapUrl,
} from "./project-hero";
import type {
  PortfolioEvidence,
  PortfolioProjectExtras,
  PortfolioProjectRow,
  PortfolioRecord,
} from "./portfolio-types";
import { filterToAccessibleProjectIds } from "./portfolio-access";
import { sortPortfolioRecords } from "./filter-portfolio";

type AssembleInput = {
  scopedProjects: PortfolioProjectRow[];
  extrasById: Record<string, PortfolioProjectExtras | undefined>;
  evidenceById: Record<string, PortfolioEvidence | undefined>;
};

const EMPTY_EXTRAS: PortfolioProjectExtras = {
  thumbnailUrl: null,
  clientName: null,
  address: null,
  location: null,
  latitude: null,
  longitude: null,
  isArchived: false,
  city: null,
  state: null,
  region: null,
};

function isHiddenStatus(status: string | null | undefined, isArchived: boolean): boolean {
  if (isArchived) return true;
  const value = (status ?? "").trim().toLowerCase();
  return value === "archived" || value === "deleted";
}

function readMetaString(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function assemblePortfolioRecords(input: AssembleInput): PortfolioRecord[] {
  const accessible = filterToAccessibleProjectIds(
    input.scopedProjects,
    input.scopedProjects.map((project) => project.id),
  );

  const assembled: PortfolioRecord[] = [];
  for (const project of accessible) {
    const extras = input.extrasById[project.id] ?? EMPTY_EXTRAS;
    if (isHiddenStatus(project.status, extras.isArchived)) continue;

    const metadata = project.metadata;
    const location = resolveProjectLocation(metadata, {
      fallbackAddress: extras.address,
      legacyLocation: extras.location,
      city: extras.city ?? readMetaString(metadata, "city"),
      state: extras.state ?? readMetaString(metadata, "state"),
      region: extras.region ?? readMetaString(metadata, "region"),
    });
    const lat = extras.latitude ?? location.lat;
    const lng = extras.longitude ?? location.lng;
    const evidence = input.evidenceById[project.id];
    const documentedAt = pickLatestIso(evidence?.timestamps ?? []);
    const clientName = extras.clientName?.trim() || null;
    const locationLabel = location.label.trim() || null;
    const context =
      clientName && clientName.toLowerCase() !== project.name.toLowerCase() ? clientName : null;

    assembled.push({
      id: project.id,
      href: vnextProjectHref(project.id),
      name: project.name,
      context,
      locationLabel:
        locationLabel && locationLabel.toLowerCase() !== (context ?? "").toLowerCase()
          ? locationLabel
          : null,
      documentedLabel: formatDocumentedDate(documentedAt),
      documentedAt,
      representations: resolveRepresentations(
        Object.fromEntries((evidence?.representations ?? []).map((id) => [id, true])),
      ),
      hero: resolveProjectHero({
        reality: evidence?.realityPreviewUrl,
        pano360: evidence?.pano360Url,
        drone: evidence?.droneUrl,
        plan: evidence?.planUrl,
        projectImage: extras.thumbnailUrl,
        satellite: lat != null && lng != null ? satelliteMapUrl(lat, lng) : null,
      }),
    });
  }

  return sortPortfolioRecords(assembled);
}
