/** Local workstation → Slate360 publish contract. Never reconstructs. */

export const ARTIFACT_KINDS = [
  "walkthrough_proxy",
  "walkthrough_poster",
  "walkthrough_master",
  "gaussian_source",
  "gaussian_web",
  "gaussian_poses",
  "gaussian_sparse",
  "gaussian_transform",
  "gaussian_preview",
  "gaussian_qa",
  "geometry_mesh",
  "geometry_cloud",
  "geometry_picking",
  "station_erp",
  "plan_pdf",
  "document",
] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export type ClientRole = "client" | "internal" | "lineage";

export type ManifestArtifact = {
  id: string;
  kind: ArtifactKind;
  path: string;
  role: ClientRole;
  contentType?: string;
  stationId?: string;
  qaStatus?: "accepted" | "rejected" | "candidate";
};

export type ArtifactManifest = {
  version: 1;
  projectKey: string;
  visitDate: string;
  title: string;
  building?: string;
  floor?: string;
  artifacts: ManifestArtifact[];
  planControls?: Array<{ pathX: number; pathY: number; planU: number; planV: number }>;
};

export type ManifestIssue = { path: string; message: string };

const CLIENT_KINDS = new Set<ArtifactKind>([
  "walkthrough_proxy",
  "walkthrough_poster",
  "gaussian_web",
  "gaussian_preview",
  "station_erp",
  "plan_pdf",
  "document",
]);

export function parseArtifactKind(value: unknown): ArtifactKind | null {
  return ARTIFACT_KINDS.includes(value as ArtifactKind) ? (value as ArtifactKind) : null;
}

export function isClientServing(item: ManifestArtifact): boolean {
  if (item.role !== "client") return false;
  if (item.qaStatus === "rejected") return false;
  if (item.kind.startsWith("gaussian_") && item.qaStatus !== "accepted") return false;
  return CLIENT_KINDS.has(item.kind);
}

export function validateManifest(raw: unknown): { manifest: ArtifactManifest | null; issues: ManifestIssue[] } {
  const issues: ManifestIssue[] = [];
  if (!raw || typeof raw !== "object") return { manifest: null, issues: [{ path: "", message: "manifest must be an object" }] };
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) issues.push({ path: "version", message: "version must be 1" });
  if (typeof o.projectKey !== "string" || !o.projectKey.trim()) issues.push({ path: "projectKey", message: "required" });
  if (typeof o.visitDate !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(o.visitDate)) {
    issues.push({ path: "visitDate", message: "must be YYYY-MM-DD" });
  }
  if (typeof o.title !== "string" || !o.title.trim()) issues.push({ path: "title", message: "required" });
  if (!Array.isArray(o.artifacts) || o.artifacts.length === 0) issues.push({ path: "artifacts", message: "at least one artifact" });

  const artifacts: ManifestArtifact[] = [];
  for (const [i, row] of (Array.isArray(o.artifacts) ? o.artifacts : []).entries()) {
    const r = row as Record<string, unknown>;
    const kind = parseArtifactKind(r.kind);
    const id = typeof r.id === "string" ? r.id : "";
    const filePath = typeof r.path === "string" ? r.path : "";
    const role = r.role === "internal" || r.role === "lineage" ? r.role : r.role === "client" ? "client" : null;
    if (!id) issues.push({ path: `artifacts[${i}].id`, message: "required" });
    if (!kind) issues.push({ path: `artifacts[${i}].kind`, message: "unknown kind" });
    if (!filePath) issues.push({ path: `artifacts[${i}].path`, message: "required" });
    if (!role) issues.push({ path: `artifacts[${i}].role`, message: "client|internal|lineage" });
    if (kind === "station_erp" && !r.stationId) issues.push({ path: `artifacts[${i}].stationId`, message: "required" });
    if (kind && id && filePath && role) {
      artifacts.push({
        id,
        kind,
        path: filePath,
        role,
        contentType: typeof r.contentType === "string" ? r.contentType : undefined,
        stationId: typeof r.stationId === "string" ? r.stationId : undefined,
        qaStatus: r.qaStatus === "accepted" || r.qaStatus === "rejected" || r.qaStatus === "candidate" ? r.qaStatus : undefined,
      });
    }
  }

  if (issues.length) return { manifest: null, issues };
  return {
    manifest: {
      version: 1,
      projectKey: String(o.projectKey),
      visitDate: String(o.visitDate).slice(0, 10),
      title: String(o.title),
      building: typeof o.building === "string" ? o.building : undefined,
      floor: typeof o.floor === "string" ? o.floor : undefined,
      artifacts,
      planControls: Array.isArray(o.planControls) ? (o.planControls as ArtifactManifest["planControls"]) : undefined,
    },
    issues,
  };
}
