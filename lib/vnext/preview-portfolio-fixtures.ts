import type { PortfolioRecord } from "./portfolio-types";

const REALITY = "/vnext-preview/reality.svg";
const PANO = "/vnext-preview/pano360.svg";
const PLAN = "/vnext-preview/plan.svg";
const PROJECT = "/vnext-preview/project.svg";

function record(partial: PortfolioRecord): PortfolioRecord {
  return partial;
}

export const PREVIEW_PORTFOLIO_RECORDS: PortfolioRecord[] = [
  record({
    id: "11111111-1111-4111-8111-111111111111",
    href: "/preview/vnext/project",
    name: "Harbor Street Residence",
    context: "Northwater Construction",
    locationLabel: "Portland, ME",
    documentedLabel: "Last documented Sep 14, 2026",
    documentedAt: "2026-09-14T15:00:00.000Z",
    representations: ["reality", "geometry", "plan"],
    hero: { kind: "reality", url: REALITY },
  }),
  record({
    id: "22222222-2222-4222-8222-222222222222",
    href: "/preview/vnext/project",
    name: "Cedar Mill Clinic",
    context: null,
    locationLabel: "Beaverton, OR",
    documentedLabel: "Last documented Aug 2, 2026",
    documentedAt: "2026-08-02T12:00:00.000Z",
    representations: ["360", "plan"],
    hero: { kind: "pano360", url: PANO },
  }),
  record({
    id: "33333333-3333-4333-8333-333333333333",
    href: "/preview/vnext/project",
    name: "West Yard Adaptive Reuse — Phase Two Interior Documentation",
    context: "Meridian Partners",
    locationLabel: "Oakland, CA",
    documentedLabel: "Last documented Jul 19, 2026",
    documentedAt: "2026-07-19T12:00:00.000Z",
    representations: ["plan"],
    hero: { kind: "plan", url: PLAN },
  }),
  record({
    id: "44444444-4444-4444-8444-444444444444",
    href: "/preview/vnext/project",
    name: "Stone Court",
    context: null,
    locationLabel: "Boise, ID",
    documentedLabel: null,
    documentedAt: null,
    representations: [],
    hero: { kind: "neutral", url: null },
  }),
  record({
    id: "55555555-5555-4555-8555-555555555555",
    href: "/preview/vnext/project",
    name: "River Annex",
    context: "Fielding Group",
    locationLabel: "Sacramento, CA",
    documentedLabel: "Last documented Jun 8, 2026",
    documentedAt: "2026-06-08T12:00:00.000Z",
    representations: ["reality", "360", "drone"],
    hero: { kind: "projectImage", url: PROJECT },
  }),
  record({
    id: "66666666-6666-4666-8666-666666666666",
    href: "/preview/vnext/project",
    name: "Ash Street School",
    context: null,
    locationLabel: "Eugene, OR",
    documentedLabel: "Last documented May 21, 2026",
    documentedAt: "2026-05-21T12:00:00.000Z",
    representations: ["360"],
    hero: { kind: "pano360", url: PANO },
  }),
];

export const PREVIEW_SCAFFOLD_PROJECT = {
  id: PREVIEW_PORTFOLIO_RECORDS[0].id,
  name: PREVIEW_PORTFOLIO_RECORDS[0].name,
  href: "/preview/vnext/project",
  navPath: "/vnext/projects/11111111-1111-4111-8111-111111111111",
};
