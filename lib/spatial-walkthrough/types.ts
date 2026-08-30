export const PRODUCT_NAME = "Spatial Walkthrough";

export type WalkthroughType = "interior" | "exterior" | "aerial" | "mixed";
export type WalkthroughStatus = "draft" | "processing" | "ready" | "failed" | "published";
export type ClipStatus = "uploading" | "processing" | "ready" | "failed";
export type SharePolicy = "client" | "public";
export type RedactionMode = "skip" | "solid" | "operator-patch" | "blur";
export type PinType =
  | "document"
  | "rfi"
  | "drawing"
  | "submittal"
  | "photo"
  | "issue"
  | "note"
  | "url"
  | "other";
export type PinVisibility = "internal" | "client" | "public";
export type LogoTreatment = "light" | "dark" | "auto";
export type OperatorPatchFill = "neutral" | "brand";
export type ShareStatus = "unshared" | "live" | "expired" | "revoked";

export type BrandTheme = {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pageBgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  logoTreatment: LogoTreatment;
  showPoweredBy: boolean;
};

export type OperatorPatch = {
  enabled: boolean;
  nadirFrac: number;
  wrapFrac: number;
  wrapY0Frac: number;
  logoInPatch: boolean;
  showDate: boolean;
  fill: OperatorPatchFill;
  showCompass: boolean;
  headingDeg: number | null;
};

export type PinLocator = {
  walkthroughId: string | null;
  clipId: string | null;
  tSeconds: number | null;
  yawDeg: number | null;
  pitchDeg: number | null;
};

export type WaypointRecord = {
  id: string;
  clipId: string;
  tSeconds: number;
  label: string | null;
  zone: string | null;
  yawDeg: number;
  pitchDeg: number;
  sortOrder: number;
  thumbnailKey: string | null;
  xyz: unknown;
  isVisible: boolean;
};

export const PIN_TYPES: PinType[] = [
  "document",
  "rfi",
  "drawing",
  "submittal",
  "photo",
  "issue",
  "note",
  "url",
  "other",
];

export const DEFAULT_OPERATOR_PATCH: OperatorPatch = {
  enabled: true,
  nadirFrac: 0.22,
  wrapFrac: 0.09,
  wrapY0Frac: 0.32,
  logoInPatch: true,
  showDate: true,
  fill: "neutral",
  showCompass: false,
  headingDeg: null,
};
