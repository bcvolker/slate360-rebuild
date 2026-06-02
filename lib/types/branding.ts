/** Org branding — white-label identity for deliverables, portals, and reports. */

import { PWA_PLACEHOLDER_ICONS } from "@/lib/pwa/icon-assets";

export interface OrgBranding {
  /** True when no custom branding exists and Slate360 defaults are used. */
  is_default: boolean;
  logo_url: string;
  logo_dark_url: string;
  favicon_url: string;
  brand_name: string;
  primary_color: string;
  accent_color: string;
  font_family: string;
}

/**
 * Hard-coded Slate360 brand identity — used when org has no custom branding.
 * Values sourced from lib/design-system/tokens.ts (single source of truth).
 */
export const DEFAULT_BRANDING: OrgBranding = {
  is_default: true,
  logo_url: "/uploads/slate360-logo-reversed-v2.svg",
  logo_dark_url: "/uploads/slate360-logo-reversed-v2.svg",
  // PLACEHOLDER ICON — pending final green/blue brand mark, do not ship to store as-is.
  favicon_url: PWA_PLACEHOLDER_ICONS.icon192,
  brand_name: "Slate360",
  primary_color: "#3B82F6",
  accent_color: "#6366F1",
  font_family: "Inter, system-ui, sans-serif",
};
