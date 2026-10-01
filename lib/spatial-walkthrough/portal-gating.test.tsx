import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AecPortalLanding } from "@/components/external-portal/AecPortalLanding";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import type { PackageDeliverable } from "@/lib/spatial-experience/portal-package";
import { housewalkPortalLanding } from "./portal-fixtures";
import {
  applyPortalCapabilities,
  gatePortalCapabilities,
  portalSections,
  type PortalCaps,
} from "./portal-gating";

const ALL_DATA: PortalCaps = {
  walkthrough: true,
  stations: true,
  plan: true,
  twin: true,
  aerial: false,
  documents: true,
  history: true,
  items: true,
};

function landing(allowed: PackageDeliverable[] | null) {
  const base = housewalkPortalLanding("client");
  const data = {
    ...base,
    reality: { walkthroughHref: "/w/t", twinHref: "/share/twin/x", stationsHref: "/tours/view/s", aerialHref: null },
    planHref: "/portal/t/plan",
  };
  const caps = gatePortalCapabilities(ALL_DATA, allowed ? new Set(allowed) : null);
  return applyPortalCapabilities(data, caps);
}

/** Chrome inventory: visible text and links of the overview, as a client would see it. */
function overviewMarkup(allowed: PackageDeliverable[] | null): string {
  return renderToStaticMarkup(<AecPortalLanding data={landing(allowed)} />);
}

describe("portal capability gating", () => {
  it("never shows Plan (no viewer yet) or the old History rail", () => {
    const caps = gatePortalCapabilities(ALL_DATA, null);
    expect(caps.plan).toBe(false);
    expect(caps.history).toBe(false);
  });

  it("requires both data and packaging", () => {
    const caps = gatePortalCapabilities({ ...ALL_DATA, twin: false }, new Set(["twin", "walkthrough"]));
    expect(caps.twin).toBe(false);
    expect(caps.walkthrough).toBe(true);
    expect(caps.documents).toBe(false);
  });

  it("fails closed when capabilities are missing", () => {
    expect(portalSections(undefined)).toEqual(["overview"]);
  });

  it("strips every payload field a disabled deliverable would surface", () => {
    const data = landing(["twin"]);
    expect(data.hero).toBeNull();
    expect(data.documents).toEqual([]);
    expect(data.items).toEqual([]);
    expect(data.activity).toEqual([]);
    expect(data.history).toEqual([]);
    expect(data.captureTree).toEqual([]);
    expect(data.shareHref).toBeNull();
    expect(data.planHref).toBeNull();
    expect(data.reality).toEqual({ walkthroughHref: null, twinHref: "/share/twin/x", stationsHref: null, aerialHref: null });
  });

  it("drops walkthrough links from documents and items when only the walkthrough is off", () => {
    const data = landing(["evidence", "issues"]);
    expect(data.documents.length).toBeGreaterThan(0);
    expect(data.documents.every((d) => d.locatorHref == null && d.thumbUrl == null)).toBe(true);
    expect(data.items.every((i) => i.locatorHref == null)).toBe(true);
  });
});

describe("portal chrome inventory (rendered)", () => {
  it("a twin-only package shows no walkthrough, documents, items, history or plan chrome", () => {
    const html = overviewMarkup(["twin"]);
    expect(html).toContain("3D Twin");
    for (const absent of ["Open Walkthrough", "/w/", "Documents", "Project items", "Open items", "History", "/plan", "Latest capture"]) {
      expect(html, absent).not.toContain(absent);
    }
  });

  it("an empty package renders the overview with no section nav at all", () => {
    const html = renderToStaticMarkup(
      <PortalChrome data={landing([])} active="overview">
        <div />
      </PortalChrome>,
    );
    expect(html).not.toContain('data-testid="portal-nav"');
  });

  it("the full legacy package keeps the walkthrough, documents and items", () => {
    const html = overviewMarkup(null);
    expect(html).toContain("Open Walkthrough");
    expect(html).toContain("Reality");
    expect(html).not.toContain(">History<");
    expect(html).not.toContain(">Plan<");
  });

  it("shows the operator banner only on preview tokens", () => {
    const client = renderToStaticMarkup(<PortalChrome data={landing(null)} active="overview"><div /></PortalChrome>);
    const preview = renderToStaticMarkup(
      <PortalChrome data={{ ...landing(null), operatorPreview: true }} active="overview"><div /></PortalChrome>,
    );
    expect(client).not.toContain("portal-operator-preview");
    expect(preview).toContain("portal-operator-preview");
  });
});
