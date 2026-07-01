/**
 * Deliverable branding — shared types (Site Walk + Twin 360 + PDF).
 * Design: docs/design/DELIVERABLE_BRANDING_LOCKED.md (9+ AI panel consensus).
 *
 * The logo-overlay transform is stored in NORMALIZED (viewport-independent) coordinates so one
 * JSON renders identically in the web viewer (any size), the twin splat viewer, and the PDF export.
 */

/** Normalized logo-overlay transform. x/y = logo CENTER as a fraction of canvas W/H (0..1);
 *  scale = logo width as a fraction of canvas width; opacity 0..1. */
export interface LogoOverlayTransform {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export interface BrandingTextLine {
  id: string;
  text: string;
  /** semantic size class → resolved to px at render (scales with canvas width) */
  size?: "caption" | "subtitle" | "legal";
}

export interface LogoOverlayConfig {
  enabled: boolean;
  /** null = inherit the org/project logo */
  logoUrl?: string | null;
  transform: LogoOverlayTransform;
  textLines?: BrandingTextLine[];
}

/** What a viewer/PDF actually renders — already resolved (org→project→deliverable) + tier-gated. */
export interface ResolvedDeliverableBranding {
  brandName: string | null;
  logoUrl: string | null;
  accentColor: string | null;
  headerTitle: string | null;
  headerSubtitle: string | null;
  footerText: string | null;
  contactBlock: {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  } | null;
  overlay: LogoOverlayConfig | null;
  /** false = white-labelled (enterprise); true = keep the Slate360 mark/footer. */
  showSlate360Mark: boolean;
}

/** Sensible default overlay: subtle, bottom-right. */
export const DEFAULT_LOGO_OVERLAY: LogoOverlayTransform = {
  x: 0.9,
  y: 0.9,
  scale: 0.16,
  opacity: 0.85,
};

/** Tier clamps applied server-side in the resolver (never trust the client). */
export const OVERLAY_LIMITS = {
  scaleMin: 0.05,
  scaleMax: 0.4,
  opacityMin: 0.3,
  opacityMax: 1,
  /** keep the logo center inside the frame so it can't be dragged fully off-canvas */
  posMin: 0.02,
  posMax: 0.98,
} as const;
