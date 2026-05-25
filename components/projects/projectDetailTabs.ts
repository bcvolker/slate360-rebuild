/**
 * Project / Worksite detail tab registry — single source for nav labels, routes, and stubs.
 */

export type ProjectDetailVariant = "worksite" | "project";

export type ProjectDetailTabId =
  | "overview"
  | "field"
  | "plans"
  | "files"
  | "team"
  | "tools";

export type ProjectDetailTabDef = {
  id: ProjectDetailTabId;
  label: string;
  /** Route segment after `/[basePath]/[projectId]`; empty string = overview root. */
  segment: string;
  /** Hidden below the `md` breakpoint in project detail nav. */
  desktopOnly?: boolean;
};

export const PROJECT_DETAIL_TABS: readonly ProjectDetailTabDef[] = [
  { id: "overview", label: "Overview", segment: "" },
  { id: "field", label: "Field", segment: "field" },
  { id: "plans", label: "Plans", segment: "plans" },
  { id: "files", label: "Files", segment: "slatedrop" },
  { id: "team", label: "Team", segment: "team" },
  { id: "tools", label: "Tools", segment: "tools", desktopOnly: true },
] as const;

const LEGACY_SEGMENT_TAB: Record<string, ProjectDetailTabId> = {
  photos: "field",
  "punch-list": "field",
  people: "team",
};

export function resolveProjectDetailVariant(
  projectType: string | null | undefined,
): ProjectDetailVariant {
  return projectType === "full" ? "project" : "worksite";
}

export function getVariantEyebrow(variant: ProjectDetailVariant): string {
  return variant === "worksite" ? "Worksite" : "Project";
}

export function buildProjectDetailHref(
  basePath: string,
  projectId: string,
  segment: string,
): string {
  return segment ? `${basePath}/${projectId}/${segment}` : `${basePath}/${projectId}`;
}

export function resolveActiveProjectDetailTab(
  pathname: string,
  basePath: string,
  projectId: string,
): ProjectDetailTabId {
  const prefix = `${basePath}/${projectId}`;

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

export type ProjectDetailStubCopy = {
  title: string;
  description: string;
  extensionNote: string;
};

export function getProjectDetailStubCopy(
  tab: Exclude<ProjectDetailTabId, "overview" | "files" | "tools">,
  variant: ProjectDetailVariant,
): ProjectDetailStubCopy {
  const copy: Record<
    Exclude<ProjectDetailTabId, "overview" | "files" | "tools">,
    Record<ProjectDetailVariant, ProjectDetailStubCopy>
  > = {
    field: {
      worksite: {
        title: "Field activity",
        description:
          "Walks, captures, punch items, and photos for this worksite will live here.",
        extensionNote: "Wire Site Walk sessions, open items, and field quick actions.",
      },
      project: {
        title: "Field coordination",
        description:
          "Assigned walks, observations, and field coordination for this project will live here.",
        extensionNote: "Wire session assignments, daily logs, and field status rollups.",
      },
    },
    plans: {
      worksite: {
        title: "Plans & documents",
        description:
          "Plan sets uploaded for walks on this worksite will appear here.",
        extensionNote: "Wire plan-set list, upload entry, and Plan Mode deep links.",
      },
      project: {
        title: "Plans & documents",
        description:
          "Drawings, plan sets, and document control for this project will appear here.",
        extensionNote: "Wire drawings register, revisions, and plan-set management.",
      },
    },
    team: {
      worksite: {
        title: "Team & access",
        description:
          "Collaborators and field workers invited to this worksite will appear here.",
        extensionNote: "Wire ProjectPeopleView, invites, and seat usage.",
      },
      project: {
        title: "Project team",
        description:
          "Members, roles, and external collaborators for this project will appear here.",
        extensionNote: "Wire ProjectPeopleView, leadership viewers, and role management.",
      },
    },
  };

  return copy[tab][variant];
}
