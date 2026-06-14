/**
 * Project detail tab registry — nav labels, routes, and active-tab resolution.
 */

export type ProjectDetailVariant = "worksite" | "project";

export type ProjectDetailTabId = "overview" | "walks" | "twins" | "issues" | "files" | "team";

export type ProjectDetailTabDef = {
  id: ProjectDetailTabId;
  label: string;
  /** Route segment after `/projects/[projectId]`; empty string = overview root. */
  segment: string;
};

export const PROJECT_DETAIL_TABS: readonly ProjectDetailTabDef[] = [
  { id: "overview", label: "Overview", segment: "" },
  { id: "walks", label: "Site Walks", segment: "walks" },
  { id: "twins", label: "Twins", segment: "twins" },
  { id: "issues", label: "Issues", segment: "punch-list" },
  { id: "files", label: "Files", segment: "slatedrop" },
  { id: "team", label: "Team", segment: "team" },
] as const;

export function resolveProjectDetailVariant(
  projectType: string | null | undefined,
): ProjectDetailVariant {
  return projectType === "full" ? "project" : "worksite";
}

const LEGACY_SEGMENT_TAB: Record<string, ProjectDetailTabId> = {
  photos: "files",
  people: "team",
  field: "walks",
  plans: "files",
  tools: "overview",
};

export function buildProjectDetailHref(projectId: string, segment: string): string {
  return segment ? `/projects/${projectId}/${segment}` : `/projects/${projectId}`;
}

export function resolveActiveProjectDetailTab(
  pathname: string,
  projectId: string,
): ProjectDetailTabId {
  const prefix = `/projects/${projectId}`;

  if (pathname === prefix || pathname === `${prefix}/`) {
    return "overview";
  }

  for (const tab of PROJECT_DETAIL_TABS) {
    if (tab.segment && pathname.startsWith(`${prefix}/${tab.segment}`)) {
      return tab.id;
    }
  }

  const trailing = pathname.slice(prefix.length + 1).split("/")[0];
  return LEGACY_SEGMENT_TAB[trailing] ?? "overview";
}
