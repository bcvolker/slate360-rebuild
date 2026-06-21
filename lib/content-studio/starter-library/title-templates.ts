import type { StarterLibraryItem } from "./types";

const BASE = {
  assetType: "title_template" as const,
  category: "Titles",
  license: "Slate360 (MIT)",
  dropTarget: "titles_lane" as const,
  gapsClosed: ["Title templates", "Add text / title"],
};

export const STARTER_TITLE_TEMPLATES: StarterLibraryItem[] = [
  { ...BASE, id: "title-lower-third", name: "Lower Third", metadata: { template: "lower_third", durationSec: 4, fontFamily: "Inter", fontSize: 48, position: "bottom-left" } },
  { ...BASE, id: "title-site-address", name: "Site Address", metadata: { template: "site_stamp", durationSec: 5, fontFamily: "Inter", fontSize: 36, position: "top-left" } },
  { ...BASE, id: "title-date-phase", name: "Date + Phase", metadata: { template: "date_phase", durationSec: 4, fontFamily: "Inter", fontSize: 34, position: "top-right" } },
  { ...BASE, id: "title-intro-full", name: "Full Intro", metadata: { template: "full_screen", durationSec: 3, fontFamily: "Orbitron", fontSize: 72, position: "center" } },
  { ...BASE, id: "title-before-label", name: "Before Label", metadata: { template: "before_after", durationSec: 3, fontFamily: "Inter", fontSize: 40, position: "top-left", label: "BEFORE" } },
  { ...BASE, id: "title-after-label", name: "After Label", metadata: { template: "before_after", durationSec: 3, fontFamily: "Inter", fontSize: 40, position: "top-left", label: "AFTER" } },
  { ...BASE, id: "title-disclaimer", name: "Disclaimer Footer", metadata: { template: "disclaimer", durationSec: 6, fontFamily: "Inter", fontSize: 24, position: "bottom" } },
  { ...BASE, id: "title-callout", name: "Callout Arrow", metadata: { template: "callout", durationSec: 4, fontFamily: "Inter", fontSize: 32, position: "center" } },
  { ...BASE, id: "title-role-card", name: "Name + Role", metadata: { template: "role_card", durationSec: 5, fontFamily: "Inter", fontSize: 44, position: "bottom-left" } },
  { ...BASE, id: "title-progress", name: "Progress Phase", metadata: { template: "phase", durationSec: 4, fontFamily: "Orbitron", fontSize: 52, position: "center" } },
];
