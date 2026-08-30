import type { BrandTheme, LogoTreatment } from "./types";

const FALLBACK: BrandTheme = {
  logoUrl: null,
  primaryColor: "var(--graphite-canvas)",
  secondaryColor: "var(--graphite-muted)",
  accentColor: "var(--graphite-primary)",
  pageBgColor: "var(--graphite-canvas)",
  surfaceColor: "color-mix(in srgb, white 4%, var(--graphite-canvas))",
  textColor: "var(--graphite-text-header)",
  mutedTextColor: "var(--graphite-muted)",
  logoTreatment: "auto",
  showPoweredBy: true,
};

const HEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export function isHexColor(value: string | null | undefined): boolean {
  return typeof value === "string" && HEX.test(value.trim());
}

export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!HEX.test(v)) return null;
  if (v.length === 4) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return v.toLowerCase();
}

export function parseLogoTreatment(value: unknown): LogoTreatment {
  return value === "light" || value === "dark" ? value : "auto";
}

export type BrandThemeLayers = {
  org?: Partial<BrandTheme> | null;
  walkthrough?: Partial<BrandTheme> | Record<string, unknown> | null;
  snapshot?: Partial<BrandTheme> | Record<string, unknown> | null;
  canHidePoweredBy: boolean;
};

function pickColor(...vals: Array<string | null | undefined>): string | null {
  for (const v of vals) {
    const hex = normalizeHex(v);
    if (hex) return hex;
    if (typeof v === "string" && v.startsWith("var(")) return v;
  }
  return null;
}

function asPartial(raw: unknown): Partial<BrandTheme> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    logoUrl: typeof o.logoUrl === "string" ? o.logoUrl : null,
    primaryColor: typeof o.primaryColor === "string" ? o.primaryColor : undefined,
    secondaryColor: typeof o.secondaryColor === "string" ? o.secondaryColor : undefined,
    accentColor: typeof o.accentColor === "string" ? o.accentColor : undefined,
    pageBgColor: typeof o.pageBgColor === "string" ? o.pageBgColor : undefined,
    surfaceColor: typeof o.surfaceColor === "string" ? o.surfaceColor : undefined,
    textColor: typeof o.textColor === "string" ? o.textColor : undefined,
    mutedTextColor: typeof o.mutedTextColor === "string" ? o.mutedTextColor : undefined,
    logoTreatment: parseLogoTreatment(o.logoTreatment),
    showPoweredBy: typeof o.showPoweredBy === "boolean" ? o.showPoweredBy : undefined,
  };
}

export function resolveBrandTheme(layers: BrandThemeLayers): BrandTheme {
  const snap = asPartial(layers.snapshot);
  const wt = asPartial(layers.walkthrough);
  const org = layers.org ?? {};
  const wantsHide = snap.showPoweredBy === false || wt.showPoweredBy === false || org.showPoweredBy === false;
  return {
    logoUrl: snap.logoUrl || wt.logoUrl || org.logoUrl || FALLBACK.logoUrl,
    primaryColor: pickColor(snap.primaryColor, wt.primaryColor, org.primaryColor) ?? FALLBACK.primaryColor,
    secondaryColor: pickColor(snap.secondaryColor, wt.secondaryColor, org.secondaryColor) ?? FALLBACK.secondaryColor,
    accentColor: pickColor(snap.accentColor, wt.accentColor, org.accentColor) ?? FALLBACK.accentColor,
    pageBgColor: pickColor(snap.pageBgColor, wt.pageBgColor, org.pageBgColor) ?? FALLBACK.pageBgColor,
    surfaceColor: pickColor(snap.surfaceColor, wt.surfaceColor, org.surfaceColor) ?? FALLBACK.surfaceColor,
    textColor: pickColor(snap.textColor, wt.textColor, org.textColor) ?? FALLBACK.textColor,
    mutedTextColor: pickColor(snap.mutedTextColor, wt.mutedTextColor, org.mutedTextColor) ?? FALLBACK.mutedTextColor,
    logoTreatment: snap.logoTreatment ?? wt.logoTreatment ?? org.logoTreatment ?? FALLBACK.logoTreatment,
    showPoweredBy: layers.canHidePoweredBy ? !wantsHide : true,
  };
}

export function themeCssVars(theme: BrandTheme): Record<string, string> {
  return {
    "--sw-primary": theme.primaryColor,
    "--sw-secondary": theme.secondaryColor,
    "--sw-accent": theme.accentColor,
    "--sw-page": theme.pageBgColor,
    "--sw-surface": theme.surfaceColor,
    "--sw-text": theme.textColor,
    "--sw-muted": theme.mutedTextColor,
  };
}
