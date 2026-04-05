/** Org branding — white-label identity for deliverables, portals, and reports. */

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

/** Hard-coded Slate360 brand identity — used when org has no custom branding. */
export const DEFAULT_BRANDING: OrgBranding = {
  is_default: true,
  logo_url: "/logo.svg",
  logo_dark_url: "/logo-dark.svg",
  favicon_url: "/favicon.ico",
  brand_name: "Slate360",
  primary_color: "#FF4D00",
  accent_color: "#6366F1",
  font_family: "Inter, system-ui, sans-serif",
};
