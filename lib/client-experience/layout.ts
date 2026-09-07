/**
 * Capability-aware layout decisions for the client experience. Pure functions
 * so the sparse/rich Overview states and mobile/desktop defaults are testable
 * without rendering.
 */
import type { ProjectBrand } from "../spatial-experience/brand";
import { visiblePortalNav, visibleRealityTiles, type ProjectCapabilities } from "../spatial-experience/capabilities";
import type { CSSProperties } from "react";
import type { ProjectExperience } from "./types";

export type NavKey = "overview" | "reality" | "plan" | "history" | "documents" | "items";
export type HeroAction = { key: "walk" | "twin" | "plan" | "stations"; label: string; href: string; primary: boolean };
export type OverviewSection = "reality" | "history" | "items" | "documents" | "activity";

/** Top-level navigation entries the client should actually see. */
export function navFor(data: ProjectExperience): NavKey[] {
  const caps = data.capabilities;
  const nav = visiblePortalNav(caps) as NavKey[];
  // A single visit is shown on the Overview; History earns a nav entry only with a real timeline.
  return nav.filter((k) => (k === "history" ? data.visits.length > 1 : k === "items" ? data.items.length > 0 : true));
}

/** Hero actions only for assets that open. Order: walkthrough → twin → plan → stations. */
export function heroActions(data: ProjectExperience): HeroAction[] {
  const caps = data.capabilities;
  const base = data.basePath, q = data.linkSuffix ?? "";
  const out: HeroAction[] = [];
  if (caps.walkthrough && data.walkthrough) out.push({ key: "walk", label: "Enter Walkthrough", href: `${base}/walk${q}`, primary: true });
  if (caps.twin && data.twin) out.push({ key: "twin", label: "Open Reality Twin", href: `${base}/twin${q}`, primary: out.length === 0 });
  if (caps.plan && data.plan) out.push({ key: "plan", label: "Open Plan", href: `${base}/plan${q}`, primary: out.length === 0 });
  if (caps.stations && data.stations.length > 0 && !out.some((a) => a.key === "walk")) {
    out.unshift({ key: "stations", label: "Open 360 Documentation", href: `${base}/stations${q}`, primary: true });
    out.forEach((a, i) => (a.primary = i === 0));
  }
  return out.slice(0, 3);
}

/** Reality tiles (modalities) that are published and accepted. */
export function realityTiles(data: ProjectExperience): Array<"walkthrough" | "twin" | "stations" | "aerial"> {
  return visibleRealityTiles(data.capabilities).filter((k) =>
    k === "walkthrough" ? Boolean(data.walkthrough) : k === "twin" ? Boolean(data.twin) : k === "stations" ? data.stations.length > 0 : false,
  );
}

/** Overview sections with real content. Empty rails are never rendered. */
export function overviewSections(data: ProjectExperience): OverviewSection[] {
  const caps = data.capabilities;
  const out: OverviewSection[] = [];
  if (realityTiles(data).length > 1) out.push("reality");
  if (caps.history && data.visits.length > 1) out.push("history");
  if ((caps.items || caps.questions) && data.items.length > 0) out.push("items");
  if (caps.documents && data.documents.length > 0) out.push("documents");
  if (data.activity.length > 1) out.push("activity");
  return out;
}

/** Path HUD defaults: on for desktop/tablet, off on phones. */
export function pathHudDefault(viewportCssWidth: number): { visible: boolean; opacity: number } {
  return { visible: viewportCssWidth >= 768, opacity: 0.28 };
}

export function clampPathOpacity(value: number): number {
  return Math.min(0.45, Math.max(0.15, Number.isFinite(value) ? value : 0.28));
}

/* ---------- brand accent safety ---------- */

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrastRatio(a: string, b: string): number {
  const pa = parseHex(a), pb = parseHex(b);
  if (!pa || !pb) return 0;
  const la = luminance(pa), lb = luminance(pb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Interaction accent derived from the brand. If the customer's accent cannot
 * reach 3:1 against the dark canvas, lighten it until it can, preserving hue.
 */
export function safeAccent(brand: ProjectBrand, canvasHex = "#0B0F15"): string | null {
  const raw = brand.accentColor;
  if (!raw) return null;
  let rgb = parseHex(raw);
  if (!rgb) return null;
  for (let i = 0; i < 8 && contrastRatio(toHex(rgb), canvasHex) < 3; i++) {
    rgb = rgb.map((c) => Math.round(c + (255 - c) * 0.18)) as [number, number, number];
  }
  return toHex(rgb);
}
function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Brand accent as a CSS variable on the experience root; used only for interactive state. */
export function brandStyle(data: ProjectExperience): CSSProperties {
  const accent = safeAccent(data.brand);
  return accent ? ({ "--ce-brand-accent": accent } as CSSProperties) : {};
}
