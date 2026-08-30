export const PRODUCT_NAME = "Spatial Walkthrough";

export type WalkthroughType = "interior" | "exterior" | "aerial" | "mixed";
export type WalkthroughStatus = "draft" | "processing" | "ready" | "failed" | "published";
export type ClipStatus = "uploading" | "processing" | "ready" | "failed";
/** MASTER is the immutable construction record. Shares are CLIENT or PUBLIC only. */
export type AccessPolicy = "master" | "client" | "public";
export type SharePolicy = "client" | "public";
export type RedactionMode = "skip" | "solid" | "operator-patch" | "blur" | "cover" | "hide-waypoint" | "panel";
export type PatchStyle = "solid" | "blur" | "logo";
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
  nadirRadius: number;
  nadirVerticalExtent: number;
  rearYawCenter: number;
  rearYawWidth: number;
  pitchMin: number;
  pitchMax: number;
  style: PatchStyle;
  fill: OperatorPatchFill;
  logoInPatch: boolean;
  showDate: boolean;
  showCompass: boolean;
  headingDeg: number | null;
  /** Inclusive start of the operator mask; null = entire clip. */
  tStart: number | null;
  /** Exclusive end of the operator mask; null = entire clip. */
  tEnd: number | null;
  /** @deprecated parsed as nadirVerticalExtent */
  nadirFrac?: number;
  /** @deprecated parsed as rear yaw wrap */
  wrapFrac?: number;
  wrapY0Frac?: number;
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
  nadirRadius: 0.28,
  nadirVerticalExtent: 0.22,
  rearYawCenter: 180,
  rearYawWidth: 64,
  pitchMin: -88,
  pitchMax: -18,
  style: "solid",
  fill: "neutral",
  logoInPatch: true,
  showDate: true,
  showCompass: false,
  headingDeg: null,
  tStart: null,
  tEnd: null,
};
