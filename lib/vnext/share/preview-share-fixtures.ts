import type { PortfolioEvidence } from "@/lib/vnext/portfolio-types";
import { composePublicOverview } from "./public-overview";
import type { ShareListItem } from "./share-rules";

export const PREVIEW_SHARE_PROJECTS = [{ id: "project-harbor", name: "Harbor Street Residence" }];

export const PREVIEW_SHARE_VIEWS = [
  { id: "sv-history", projectId: "project-harbor", title: "Above-ceiling plumbing" },
];

export const PREVIEW_SHARE_LINKS: ShareListItem[] = [
  {
    id: "link-live",
    label: "Harbor client",
    projectName: "Harbor Street Residence",
    targetLabel: "Project",
    createdLabel: "Sep 22, 2026",
    expiresLabel: "Oct 22, 2026",
    status: "Active",
    opens: 3,
    url: "https://slate360.ai/share/project/preview-harbor-client-link-0000000001",
  },
  {
    id: "link-old",
    label: "Earlier walk",
    projectName: "Harbor Street Residence",
    targetLabel: "Saved view",
    createdLabel: "Sep 18, 2026",
    expiresLabel: "Sep 20, 2026",
    status: "Expired",
    opens: 2,
    url: "https://slate360.ai/share/project/preview-expired-link-000000000001",
  },
];

const PREVIEW_EVIDENCE: PortfolioEvidence = {
  realityPreviewUrl: "/api/vnext/projects/project-harbor/twin-models/model-a/preview-image",
  pano360Url: null,
  droneUrl: "https://private.example/drone.jpg",
  planUrl: null,
  timestamps: ["2020-01-01T00:00:00.000Z"],
  representations: ["reality", "geometry", "plan", "thermal", "drone"],
};

export const PREVIEW_PUBLIC_OVERVIEW = composePublicOverview({
  id: "project-harbor",
  name: "Harbor Street Residence",
  context: "Northwater Construction",
  locationLabel: "Portland, ME",
  evidence: PREVIEW_EVIDENCE,
  projectId: "project-harbor",
  token: "preview-harbor-client-link-0000000001",
  sections: ["overview", "explore", "history"],
  publishedVisits: [{ occurredAt: "2026-09-14T15:00:00.000Z", sourceLabel: "3D scan" }],
});
