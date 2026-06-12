/** Canonical PWA / favicon raster paths (generated from assets/brand/slate360-icon.svg).
 * Bump ICON_VERSION whenever the rasters are regenerated — browsers and the PWA
 * manifest cache icon URLs aggressively, so the querystring is what forces a refetch. */
const ICON_VERSION = "20260612";

export const PWA_ICONS = {
  icon192: `/uploads/icon-192.png?v=${ICON_VERSION}`,
  icon512: `/uploads/icon-512.png?v=${ICON_VERSION}`,
  icon512Maskable: `/uploads/icon-512-maskable.png?v=${ICON_VERSION}`,
  appleTouch: `/uploads/apple-touch-icon.png?v=${ICON_VERSION}`,
  favicon32: `/uploads/favicon-32.png?v=${ICON_VERSION}`,
  favicon16: `/uploads/favicon-16.png?v=${ICON_VERSION}`,
} as const;

/** Source vector — assets/brand/slate360-icon.svg */
export const BRAND_ICON_SVG = "assets/brand/slate360-icon.svg";
