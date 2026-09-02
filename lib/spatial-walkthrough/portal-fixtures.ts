import type { BrandTheme } from "./types";
import { resolveBrandTheme } from "./theme";

const WALK = "S0Ho5PRcBjg6pW2uVrFFvm1EMSQjX269";
const CLIP = "f278d37f-1c2f-4511-aef5-437b3992d39d";
const POSTER = `/api/spatial-walkthrough/public/${WALK}/media?clip=${CLIP}&kind=hero`;
const OPEN = `/w/${WALK}`;

export type PortalCapture = {
  id: string;
  title: string;
  capturedAt: string;
  kind: string;
  status: string;
  posterUrl: string | null;
  href: string;
};

export type PortalLandingData = {
  profile: "construction" | "marketing" | "facilities" | "wayfinding";
  projectName: string;
  location: string | null;
  latestCaptureAt: string | null;
  brand: BrandTheme;
  hero: PortalCapture | null;
  history: PortalCapture[];
  attention: { open: number; urgent: number; questions: number };
  documents: Array<{ id: string; title: string; kind: string; href: string; thumbUrl: string | null; locatorHref?: string | null }>;
  projects: Array<{ id: string; name: string; location: string | null; thumbUrl: string | null; href: string }>;
  compareAvailable: boolean;
  shareHref: string | null;
  token: string;
  items: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    priority: string;
    href: string;
    locatorHref: string | null;
  }>;
  activity: Array<{ id: string; title: string; kind: string; href: string; createdAt: string }>;
  captureTree: Array<{ label: string; status: "ready" | "pocket"; href: string | null }>;
};

const HOUSEWALK_THEME = resolveBrandTheme({
  snapshot: { showPoweredBy: true, logoOpacity: 0.88 },
  canHidePoweredBy: true,
});

export function housewalkPortalLanding(theme: "slate" | "client" = "slate"): PortalLandingData {
  const hero: PortalCapture = {
    id: "hw-1",
    title: "HouseWalk X4 — latest capture",
    capturedAt: "2026-08-30T01:21:36.51+00:00",
    kind: "walkthrough",
    status: "ready",
    posterUrl: POSTER,
    href: OPEN,
  };
  const brand =
    theme === "client"
      ? resolveBrandTheme({
          snapshot: {
            logoUrl: "/logo.svg",
            companyName: "Harbor Point",
            showPoweredBy: true,
            logoOpacity: 0.9,
          },
          canHidePoweredBy: true,
        })
      : HOUSEWALK_THEME;
  return {
    profile: "construction",
    projectName: theme === "client" ? "Harbor Point Residences" : "HouseWalk X4",
    location: theme === "client" ? "Tacoma, WA" : "HouseWalk · Interior",
    latestCaptureAt: hero.capturedAt,
    brand,
    hero,
    history: [
      hero,
      { id: "hw-0", title: "Prior interior pass", capturedAt: "2026-08-12T18:00:00.000Z", kind: "walkthrough", status: "ready", posterUrl: POSTER, href: OPEN },
    ],
    attention: { open: 3, urgent: 1, questions: 2 },
    documents: [
      { id: "d1", title: "Kitchen spec sheet", kind: "drawing", href: OPEN, thumbUrl: POSTER },
      { id: "d2", title: "Landing rail RFI", kind: "rfi", href: `${OPEN}?pin=520c6060-0a60-4b91-9cc1-033784baa77f`, thumbUrl: POSTER },
    ],
    projects: [
      { id: "p1", name: theme === "client" ? "Harbor Point Residences" : "HouseWalk X4", location: "Interior", thumbUrl: POSTER, href: "/preview/monday-portal" },
      { id: "p2", name: "Yard survey", location: "Exterior", thumbUrl: POSTER, href: "/preview/monday-portal?project=yard" },
    ],
    compareAvailable: true,
    shareHref: OPEN,
    token: WALK,
    items: [
      { id: "d2", type: "rfi", title: "Landing rail RFI", status: "open", priority: "high", href: `/portal/${WALK}/item/520c6060-0a60-4b91-9cc1-033784baa77f`, locatorHref: `${OPEN}?pin=520c6060-0a60-4b91-9cc1-033784baa77f` },
    ],
    activity: [
      { id: "a1", title: "Landing rail RFI", kind: "question", href: `/portal/${WALK}/item/520c6060-0a60-4b91-9cc1-033784baa77f`, createdAt: hero.capturedAt },
    ],
    captureTree: [
      { label: "Interior · Main Walk", status: "ready", href: OPEN },
    ],
  };
}
