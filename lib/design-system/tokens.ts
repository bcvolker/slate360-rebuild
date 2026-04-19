/**
 * ═══════════════════════════════════════════════════════════════
 * Slate360 Design System — Token Foundation
 *
 * SINGLE SOURCE OF TRUTH for brand colors, surface primitives,
 * typography scales, spacing, and asset references.
 *
 * Usage:
 *   import { brand, surfaces, assets } from "@/lib/design-system/tokens";
 *
 * This file is consumed by:
 *   - React components (TypeScript values)
 *   - Email templates (inline styles)
 *   - Token audit scripts
 *
 * CSS variables live in globals.css and mirror these values.
 * When changing a color here, also update the matching CSS var.
 *
 * Enterprise white-label: override via org_branding DB row.
 * ═══════════════════════════════════════════════════════════════
 */

/* ── Brand Identity ─────────────────────────────────────────── */

export const brand = {
  /** Primary brand accent — cobalt family (legacy key name `gold` retained for compatibility) */
  gold: "#3B82F6",
  goldHover: "#2563EB",
  goldLight: "rgba(59, 130, 246, 0.08)",
  goldLightDark: "rgba(59, 130, 246, 0.14)",
  goldRing: "rgba(59, 130, 246, 0.5)",
  goldGlow:
    "0 0 20px 0 rgba(59, 130, 246, 0.35), 0 4px 12px 0 rgba(59, 130, 246, 0.20)",

  /** Primary HSL for CSS custom properties */
  goldHsl: "217 91% 60%",
  goldHoverHsl: "221 83% 53%",
  goldHoverHslDark: "221 83% 53%",

  /** Core dark surface — deep navy family */
  graphite: "#151A23",
  graphiteHover: "#1e2533",
  graphiteDeep: "#0B0F15",
  graphiteMid: "#1e2533",
  graphiteLight: "#2a3344",

  /** White/light text family */
  white: "#ffffff",
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  textSubtle: "#52525b",

  /** Steel — secondary accent (link hover, secondary icons, nav active). Legacy key name `teal` retained. */
  teal: "#94A3B8",
  tealSoft: "rgba(148, 163, 184, 0.18)",
  tealHover: "#CBD5E1",

  /** Brand name */
  name: "Slate360",
} as const;

/* ── App Shell Skin (single source of truth — matches mobile-shell-v2) */

export const appShell = {
  /** Page background */
  page: "#0B0F15",
  /** Card / panel surface */
  card: "#151A23",
  /** Hover overlay applied on top of card */
  cardHover: "rgba(255, 255, 255, 0.04)",
  /** Thin glass border on every card */
  border: "rgba(255, 255, 255, 0.05)",
  /** Glass header / footer / bottom-nav background */
  glass: "rgba(11, 15, 21, 0.80)",
  /** Backdrop filter for glass surfaces */
  backdropBlur: "blur(16px)",
  /** Soft cobalt glow used on logo tile + primary CTA */
  glowAmber: "0 0 15px rgba(59, 130, 246, 0.18)",
  /** Stronger cobalt glow used on primary CTA hover */
  glowAmberStrong:
    "0 0 20px 0 rgba(59, 130, 246, 0.35), 0 4px 12px 0 rgba(59, 130, 246, 0.20)",
  /** Card shadow */
  cardShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.3)",
  /** Elevated / hero card shadow */
  elevatedShadow: "0 8px 32px -4px rgba(0, 0, 0, 0.4)",
  /** Card corner radius (rounded-2xl) */
  radius: "1rem",
  /** Icon tile corner radius (rounded-xl) */
  iconRadius: "0.75rem",
  /** Hover micro-lift */
  hoverLift: "-2px",
  /** Active state scale */
  activeScale: "0.99",
} as const;

/* ── Module Accent Colors ───────────────────────────────────── */

export const modules = {
  hub: "#3B82F6",
  design: "#7C3AED",
  content: "#EC4899",
  tours: "#0891B2",
  geo: "#059669",
  virtual: "#2563EB",
  analytics: "#6366F1",
  market: "#6366F1",
  slatedrop: "#3B82F6",
} as const;

/* ── Status Colors ──────────────────────────────────────────── */

export const status = {
  open: "#2563EB",
  openBg: "#EFF6FF",
  review: "#2563EB",
  reviewBg: "#FFFBEB",
  approved: "#059669",
  approvedBg: "#ECFDF5",
  closed: "#059669",
  closedBg: "#ECFDF5",
  overdue: "#DC2626",
  overdueBg: "#FEF2F2",
  draft: "#6B7280",
  draftBg: "#F9FAFB",
} as const;

/* ── Surfaces ───────────────────────────────────────────────── */

export const surfaces = {
  /** Light mode */
  light: {
    page: "#ECEEF2",
    card: "#FFFFFF",
    cardHover: "#F9FAFB",
    glass: "hsl(0 0% 100% / 0.85)",
    glassSecondary: "hsl(0 0% 98%)",
    border: "hsl(0 0% 0% / 0.08)",
    shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
    shadowGlass: "0 8px 32px -4px rgb(0 0 0 / 0.12)",
  },
  /** Dark mode */
  dark: {
    page: "#0B0F15",
    card: "#151A23",
    cardHover: "#1e2533",
    glass: "rgba(11, 15, 21, 0.80)",
    glassSecondary: "#0B0F15",
    border: "rgba(255, 255, 255, 0.08)",
    shadow: "0 1px 3px 0 rgb(0 0 0 / 0.3)",
    shadowGlass: "0 8px 32px -4px rgb(0 0 0 / 0.4)",
  },
} as const;

/* ── Card Primitives (from mobile shell visual source of truth) */

export const cardPrimitives = {
  /** Corner radius matching mobile quick-actions (rounded-2xl = 1rem) */
  radius: "1rem",
  radiusSm: "0.75rem",
  radiusLg: "1.25rem",
  radiusXl: "1.5rem",

  /** Icon container radius (rounded-xl = 0.75rem) */
  iconRadius: "0.75rem",

  /** Border — thin, low-contrast glass border */
  borderWidth: "1px",

  /** Shadow family */
  shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
  shadowElevated: "0 4px 12px -2px rgb(0 0 0 / 0.15)",
  shadowHero: "0 8px 32px -4px rgb(0 0 0 / 0.12)",

  /** Active state — scale down slightly */
  activeScale: "0.99",

  /** Hover state — lift */
  hoverShadow: "0 8px 24px -4px rgb(0 0 0 / 0.15)",
} as const;

/* ── Typography Scale ───────────────────────────────────────── */

export const typography = {
  fontFamily: "Inter, system-ui, sans-serif",
  /** Heading weight — extra black for premium feel */
  headingWeight: "800",
  /** Body weight */
  bodyWeight: "400",
  /** Label weight — semibold */
  labelWeight: "600",
  /** CTA button weight — bold */
  ctaWeight: "700",
  /** Tracking for uppercase micro labels */
  wideTracking: "0.1em",
} as const;

/* ── Asset References ───────────────────────────────────────── */

export const assets = {
  /** Primary logo (reversed/white on dark — no dark-mode media query) */
  logo: "/uploads/slate360-logo-reversed-v2.svg",
  /** Absolute URL for emails and external contexts */
  logoAbsolute: "https://www.slate360.ai/uploads/slate360-logo-reversed-v2.svg",
  /** Favicon (cache-busted v2) */
  favicon: "/icon-v2.svg",
  /** Upload-directory favicon */
  faviconUpload: "/uploads/slate360-favicon-v2.svg",
  /** PWA icons */
  icon192: "/uploads/icon-192.png",
  icon512: "/uploads/icon-512.png",
  icon512Maskable: "/uploads/icon-512-maskable.png",
  /** PWA screenshots */
  screenshotNarrow: "/uploads/screenshot-narrow.png",
  screenshotWide: "/uploads/screenshot-wide.png",
} as const;

/* ── Email Template Helpers ─────────────────────────────────── */

export const emailStyles = {
  headerBg: brand.graphite,
  bodyBg: "#f4f4f5",
  cardBg: brand.white,
  ctaBg: brand.gold,
  ctaColor: brand.graphite,
  footerColor: brand.textMuted,
  logoUrl: assets.logoAbsolute,
  logoWidth: 140,
} as const;

/* ── CSS Variable Names (for grep/audit tooling) ────────────── */

export const cssVarNames = {
  gold: "--slate-gold",
  goldHover: "--slate-gold-hover",
  goldLight: "--slate-gold-light",
  graphite: "--slate-blue",
  graphiteHover: "--slate-blue-hover",
  primary: "--primary",
  primaryHover: "--primary-hover",
  surfacePage: "--surface-page",
  surfaceCard: "--surface-card",
  surfaceGlass: "--surface-glass",
  borderGlass: "--border-glass",
} as const;
