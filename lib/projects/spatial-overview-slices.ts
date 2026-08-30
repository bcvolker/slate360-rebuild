export type ProjectOverviewActivity = {
  id: string;
  kind: "walk" | "twin" | "file" | "walkthrough" | "pin";
  title: string;
  meta: string;
  href: string;
  occurredAt: string;
};

export type ProjectOverviewWalkthrough = {
  id: string;
  title: string;
  capturedAt: string | null;
  building: string | null;
  floor: string | null;
  href: string;
};

export type ProjectOverviewPin = {
  id: string;
  title: string;
  meta: string;
  href: string;
};

export type ProjectOverviewData = {
  projectId: string;
  name: string;
  status: string;
  locationLabel: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  counts: {
    walks: number;
    twins: number;
    files: number;
    deliverables: number;
    teamMembers: number;
    walkthroughs: number;
  };
  lastFileUploadAt: string | null;
  recentActivity: ProjectOverviewActivity[];
  latestWalkthrough: ProjectOverviewWalkthrough | null;
  recentWalkthroughs: ProjectOverviewWalkthrough[];
  recentFiles: ProjectOverviewActivity[];
  recentPins: ProjectOverviewPin[];
  showTwins: boolean;
  showSiteWalk: boolean;
  showWalkthroughs: boolean;
  spatialOnly: boolean;
};

export type ProjectMetadata = {
  address?: string;
  city?: string;
  state?: string;
  region?: string;
  start_date?: string;
  end_date?: string;
  startDate?: string;
  endDate?: string;
};

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function formatStatusLabel(status: string | null | undefined): string {
  const raw = (status ?? "active").trim();
  if (!raw) return "Active";
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function readMetaDate(metadata: ProjectMetadata, ...keys: Array<keyof ProjectMetadata>): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function mapOverviewWalkthroughs(
  projectId: string,
  rows: Array<{
    id: string;
    title: string;
    captured_at: string | null;
    building: string | null;
    floor: string | null;
  }>,
): ProjectOverviewWalkthrough[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title || "Spatial Walkthrough",
    capturedAt: row.captured_at,
    building: row.building,
    floor: row.floor,
    href: `/projects/${projectId}/walkthroughs/${row.id}`,
  }));
}

export function mapOverviewPins(
  projectId: string,
  rows: Array<{ id: string; label: string; pin_type: string; walkthrough_id: string }>,
): ProjectOverviewPin[] {
  return rows.map((pin) => ({
    id: pin.id,
    title: pin.label || "Pin",
    meta: pin.pin_type,
    href: `/projects/${projectId}/walkthroughs/${pin.walkthrough_id}`,
  }));
}
