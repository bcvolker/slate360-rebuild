import type { VnextHeroResult, VnextRepresentation } from "./portfolio-types";

export type VnextLatestVisit = {
  occurredAt: string;
  dateLabel: string;
  sourceLabel: string;
};

export type VnextRecentItem = {
  id: string;
  title: string;
  statusLabel: string;
  updatedAt: string;
  dateLabel: string;
};

export type VnextRecentDocument = {
  id: string;
  name: string;
  uploadedAt: string;
  dateLabel: string;
};

export type VnextProjectOverview = {
  id: string;
  name: string;
  context: string | null;
  locationLabel: string | null;
  hero: VnextHeroResult;
  documentedLabel: string | null;
  latestVisit: VnextLatestVisit | null;
  representations: VnextRepresentation[];
  recentItems: VnextRecentItem[];
  recentDocuments: VnextRecentDocument[];
  exploreHref: string;
  itemsHref: string;
  documentsHref: string;
  historyHref: string;
};
