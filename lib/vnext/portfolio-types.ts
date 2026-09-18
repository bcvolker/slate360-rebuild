export const VNEXT_REPRESENTATIONS = [
  "reality",
  "geometry",
  "360",
  "plan",
  "drone",
  "thermal",
] as const;

export type VnextRepresentation = (typeof VNEXT_REPRESENTATIONS)[number];

export const HERO_PRIORITY = [
  "reality",
  "pano360",
  "drone",
  "plan",
  "projectImage",
  "satellite",
  "neutral",
] as const;

export type VnextHeroKind = (typeof HERO_PRIORITY)[number];

export type VnextHeroCandidates = Partial<Record<Exclude<VnextHeroKind, "neutral">, string | null | undefined>>;

export type VnextHeroResult = {
  kind: VnextHeroKind;
  url: string | null;
};

export type PortfolioRecord = {
  id: string;
  href: string;
  name: string;
  context: string | null;
  locationLabel: string | null;
  documentedLabel: string | null;
  documentedAt: string | null;
  representations: VnextRepresentation[];
  hero: VnextHeroResult;
};

export type PortfolioProjectRow = {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  status: string | null;
  created_at: string | null;
};

export type PortfolioProjectExtras = {
  thumbnailUrl: string | null;
  clientName: string | null;
  address: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  isArchived: boolean;
  city: string | null;
  state: string | null;
  region: string | null;
};

export type PortfolioEvidence = {
  realityPreviewUrl: string | null;
  pano360Url: string | null;
  droneUrl: string | null;
  planUrl: string | null;
  timestamps: string[];
  representations: VnextRepresentation[];
};
