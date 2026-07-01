/**
 * Deliverable branding resolver (pure). Merges the branding layers and enforces tier gating.
 * Resolution order: Slate360 default -> org -> project -> deliverable override.
 * White-label (removing the Slate360 mark / using a custom logo in the shell) is gated by
 * `canWhiteLabel` — enforced HERE, server-side. Viewers read the resolved object, never raw layers.
 * Design: docs/design/DELIVERABLE_BRANDING_LOCKED.md.
 */
import { clampTransform } from "./overlay-math";
import {
  DEFAULT_LOGO_OVERLAY,
  type LogoOverlayConfig,
  type ResolvedDeliverableBranding,
} from "./overlay-types";

/** A single branding layer (org / project / deliverable) — all fields optional. */
export interface BrandingLayer {
  brandName?: string | null;
  logoUrl?: string | null;
  accentColor?: string | null;
  headerTitle?: string | null;
  headerSubtitle?: string | null;
  footerText?: string | null;
  contactBlock?: ResolvedDeliverableBranding["contactBlock"];
  overlay?: LogoOverlayConfig | null;
  /** deliverable intent to hide the Slate360 mark (honored only if canWhiteLabel) */
  hideSlate360Mark?: boolean;
}

const SLATE360_DEFAULT: BrandingLayer = {
  brandName: "Slate360",
  logoUrl: null,
  accentColor: null,
};

function pick<T>(...vals: (T | null | undefined)[]): T | null {
  for (const v of vals) if (v !== undefined && v !== null && v !== "") return v as T;
  return null;
}

export function resolveDeliverableBranding(
  layers: { org?: BrandingLayer | null; project?: BrandingLayer | null; deliverable?: BrandingLayer | null },
  opts: { canWhiteLabel: boolean },
): ResolvedDeliverableBranding {
  const { org, project, deliverable } = layers;
  // deliverable > project > org > default for each field
  const logoUrl = pick(deliverable?.logoUrl, project?.logoUrl, org?.logoUrl);

  // Overlay: take the most specific enabled config; clamp its transform to tier-safe limits.
  const rawOverlay = deliverable?.overlay ?? project?.overlay ?? org?.overlay ?? null;
  const overlay: LogoOverlayConfig | null =
    rawOverlay && rawOverlay.enabled
      ? {
          enabled: true,
          logoUrl: pick(rawOverlay.logoUrl, logoUrl),
          transform: clampTransform(rawOverlay.transform ?? DEFAULT_LOGO_OVERLAY),
          textLines: rawOverlay.textLines?.slice(0, opts.canWhiteLabel ? 4 : 2),
        }
      : null;

  // White-label: only enterprise (canWhiteLabel) may hide the Slate360 mark or fully swap the shell logo.
  const wantsHide = Boolean(deliverable?.hideSlate360Mark);
  const showSlate360Mark = opts.canWhiteLabel ? !wantsHide : true;

  return {
    brandName: pick(deliverable?.brandName, project?.brandName, org?.brandName, SLATE360_DEFAULT.brandName),
    logoUrl,
    accentColor: pick(deliverable?.accentColor, project?.accentColor, org?.accentColor),
    headerTitle: pick(deliverable?.headerTitle, project?.headerTitle, org?.headerTitle),
    headerSubtitle: pick(deliverable?.headerSubtitle, project?.headerSubtitle, org?.headerSubtitle),
    footerText: pick(deliverable?.footerText, project?.footerText, org?.footerText),
    contactBlock: deliverable?.contactBlock ?? project?.contactBlock ?? org?.contactBlock ?? null,
    overlay,
    showSlate360Mark,
  };
}
