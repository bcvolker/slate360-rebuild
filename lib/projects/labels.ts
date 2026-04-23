/**
 * lib/projects/labels.ts
 *
 * Tier-aware UI label resolver for the unified `projects` table.
 *
 * Strategy (see SLATE360_PROJECT_MEMORY.md → "Unified Projects Architecture"):
 *   - All work lives in ONE `projects` table regardless of tier.
 *   - Lower-tier (Site Walk only) users see the noun "Site" / "Sites".
 *   - Higher-tier (Pro project management) users see "Project" / "Projects".
 *   - Upgrades are frictionless: only the label flips; data does not move.
 *
 * Always import from this module. Do NOT hardcode "Project" or "Site"
 * in components, headings, breadcrumbs, empty states, or v0 imports.
 */
import type { Tier } from "@/lib/entitlements";

/** Tiers that get the simpler "Site" terminology. */
const SITE_TIERS: ReadonlySet<Tier> = new Set<Tier>(["trial", "standard"]);

export type ProjectNoun = "Site" | "Project";
export type ProjectNounPlural = "Sites" | "Projects";

/** Singular noun for the project container at this tier. */
export function getProjectLabel(tier: Tier | null | undefined): ProjectNoun {
  if (!tier) return "Project";
  return SITE_TIERS.has(tier) ? "Site" : "Project";
}

/** Plural noun for the project container at this tier. */
export function getProjectsLabel(tier: Tier | null | undefined): ProjectNounPlural {
  if (!tier) return "Projects";
  return SITE_TIERS.has(tier) ? "Sites" : "Projects";
}

/** Lowercase variant for inline copy ("create a new site" / "create a new project"). */
export function getProjectLabelLower(tier: Tier | null | undefined): Lowercase<ProjectNoun> {
  return getProjectLabel(tier).toLowerCase() as Lowercase<ProjectNoun>;
}

export function getProjectsLabelLower(
  tier: Tier | null | undefined,
): Lowercase<ProjectNounPlural> {
  return getProjectsLabel(tier).toLowerCase() as Lowercase<ProjectNounPlural>;
}

/**
 * Convenience bundle for components that need every form at once.
 * Useful for v0-generated components that take a single `labels` prop.
 */
export interface ProjectLabels {
  singular: ProjectNoun;
  plural: ProjectNounPlural;
  singularLower: Lowercase<ProjectNoun>;
  pluralLower: Lowercase<ProjectNounPlural>;
}

export function getProjectLabels(tier: Tier | null | undefined): ProjectLabels {
  return {
    singular: getProjectLabel(tier),
    plural: getProjectsLabel(tier),
    singularLower: getProjectLabelLower(tier),
    pluralLower: getProjectsLabelLower(tier),
  };
}
