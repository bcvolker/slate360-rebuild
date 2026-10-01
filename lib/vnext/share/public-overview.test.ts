import { describe, expect, it } from "vitest";
import type { VnextVisit } from "@/lib/vnext/history/history-types";
import type { PortfolioEvidence } from "@/lib/vnext/portfolio-types";
import { scopeFromIncluded } from "@/lib/vnext/scope/resolve-client-scope";
import { composePublicOverview, publicVisitMoments, shareSafeHeroUrl } from "./public-overview";

const TOKEN = "a".repeat(43);
const PROJECT = "project-a";

function evidence(partial: Partial<PortfolioEvidence> = {}): PortfolioEvidence {
  return {
    realityPreviewUrl: null,
    pano360Url: null,
    droneUrl: null,
    planUrl: null,
    timestamps: ["2020-01-01T00:00:00.000Z"],
    representations: [],
    ...partial,
  };
}

function visit(partial: Partial<VnextVisit> & Pick<VnextVisit, "kind" | "occurredAt">): VnextVisit {
  return {
    id: "visit-1",
    dateLabel: "Sep 14, 2026",
    title: "Visit",
    kindLabel: "3D scan",
    sources: [],
    plans: [],
    items: [{ id: "item-1", title: "Hidden item", href: "/items/1" }],
    itemCount: 1,
    thumbnailHref: null,
    frame: null,
    ...partial,
  };
}

describe("public project overview", () => {
  it("uses published project evidence and omits items, documents, and thermal", () => {
    const overview = composePublicOverview({
      id: PROJECT,
      name: "Harbor Street Residence",
      context: "Northwater Construction",
      locationLabel: "Portland, ME",
      projectId: PROJECT,
      token: TOKEN,
      sections: ["overview", "explore", "history"],
      evidence: evidence({
        realityPreviewUrl: `/api/vnext/projects/${PROJECT}/twin-models/model-a/preview-image`,
        droneUrl: "https://private.example/drone.jpg",
        representations: ["reality", "geometry", "drone", "thermal"],
      }),
      publishedVisits: [{ occurredAt: "2026-09-14T15:00:00.000Z", sourceLabel: "3D scan" }],
    });

    expect(overview.name).toBe("Harbor Street Residence");
    expect(overview.context).toBe("Northwater Construction");
    expect(overview.locationLabel).toBe("Portland, ME");
    expect(overview.hero).toEqual({
      kind: "reality",
      url: `/api/share/project/${TOKEN}/twin-models/model-a/preview-image`,
    });
    expect(overview.documentedLabel).toBe("Last documented Sep 14, 2026");
    expect(overview.latestVisit?.sourceLabel).toBe("3D scan");
    expect(overview.representations).toEqual(["reality", "geometry"]);
    expect(overview.recentItems).toEqual([]);
    expect(overview.recentDocuments).toEqual([]);
    expect(overview.exploreHref).toBe(`/share/project/${TOKEN}/explore`);
    expect(overview.historyHref).toBe(`/share/project/${TOKEN}/history`);
  });

  it("drops an unpublished or private image and a capability that is off", () => {
    const hidden = composePublicOverview({
      id: PROJECT,
      name: "Harbor Street Residence",
      context: null,
      locationLabel: null,
      projectId: PROJECT,
      token: TOKEN,
      sections: ["overview", "explore", "history"],
      evidence: evidence({
        realityPreviewUrl: "https://private.example/unpublished.jpg",
        pano360Url: `/api/vnext/projects/${PROJECT}/items/pano-1/image`,
        representations: ["360"],
      }),
      publishedVisits: [],
    });
    expect(hidden.hero).toEqual({
      kind: "pano360",
      url: `/api/share/project/${TOKEN}/items/pano-1/image`,
    });
    expect(hidden.representations).toEqual(["360"]);
    expect(hidden.documentedLabel).toBeNull();
    expect(shareSafeHeroUrl("https://cdn.example/projects/thumbnail.jpg", PROJECT, TOKEN)).toBeNull();

    const capabilityOff = composePublicOverview({
      id: PROJECT,
      name: "Harbor Street Residence",
      context: null,
      locationLabel: null,
      projectId: PROJECT,
      token: TOKEN,
      sections: ["overview"],
      evidence: evidence({
        realityPreviewUrl: `/api/vnext/projects/${PROJECT}/twin-models/model-a/preview-image`,
        representations: [],
      }),
      publishedVisits: [{ occurredAt: "2026-09-14T15:00:00.000Z", sourceLabel: "3D scan" }],
    });
    expect(capabilityOff.hero.kind).toBe("neutral");
    expect(capabilityOff.hero.url).toBeNull();
    expect(capabilityOff.representations).toEqual([]);
    expect(capabilityOff.latestVisit).toBeNull();
    expect(capabilityOff.documentedLabel).toBe("Last documented Sep 14, 2026");
  });

  it("keeps a published visit only when its capability is included", () => {
    const scan = visit({
      kind: "reality",
      occurredAt: "2026-09-18T00:00:00.000Z",
      kindLabel: "3D scan",
      sources: [
        { rep: "reality", label: "Model A", sourceId: "model-a", exploreHref: "/explore", imageHref: null },
      ],
    });
    const thermal = visit({
      id: "thermal-1",
      kind: "thermal",
      occurredAt: "2026-09-19T00:00:00.000Z",
      kindLabel: "Thermal scan",
      sources: [{ rep: "thermal", label: "Thermal", sourceId: "t1", exploreHref: "/explore", imageHref: null }],
    });
    expect(publicVisitMoments([scan, thermal], scopeFromIncluded(["reality", "history"]))).toEqual([
      { occurredAt: "2026-09-18T00:00:00.000Z", sourceLabel: "3D scan" },
    ]);
    expect(publicVisitMoments([scan], scopeFromIncluded(["history"]))).toEqual([]);
  });
});
