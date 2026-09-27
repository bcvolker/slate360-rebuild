import { GOLDEN_SHA256 } from "./scene-config";

/**
 * Curated Room 213 spatial pins (preview data file, shaped for the future spatial_project_items / locators /
 * documents tables). Anchors are in the golden model's FILE frame (`source_frame: "file"`) and bound to its
 * sha256 — never to Gaussian indices — so presentation crops or a derived presentation asset don't move them.
 * A replacement reconstruction needs an explicit registration/migration of these anchors.
 */
export type PinContentType = "photo" | "drawing" | "note" | "document" | "url";

export type PinContent = {
  type: PinContentType;
  custom_type?: string;
  title: string;
  url: string;
  thumbnail?: string;
  caption?: string;
};

export type SpatialPin = {
  pin_id: string;
  source_model_sha: string;
  source_frame: "file";
  position: [number, number, number];
  normal: [number, number, number];
  title: string;
  description: string;
  icon: "drawing" | "photo";
  content: PinContent[];
  visibility: "public";
};

const C = "/preview/room213/content";

// Anchors verified against the capture (2026-09-27, docs/ops/room213-poc/PINS.md): whiteboard centre on the
// front wall; the photo spot at the whiteboard/door junction; the window-end row of the near-window table block
// (marked to move under both possible readings of the layout drawing); a row of the 5-row block (all staying).

export const ROOM213_PINS: SpatialPin[] = [
  {
    pin_id: "layout",
    source_model_sha: GOLDEN_SHA256,
    source_frame: "file",
    position: [4.9, 0.356, 1.185],
    normal: [-1, 0, 0],
    title: "Furniture layout",
    description:
      "The furniture layout issued for this move: tables shown hatched in magenta leave the room; the rest stay. The drawing is shown for reference — it is not a registered as-built plan.",
    icon: "drawing",
    content: [{ type: "drawing", title: "Furniture layout — Classroom 213", url: `${C}/furniture-layout.jpg`, thumbnail: `${C}/furniture-layout-thumb.jpg` }],
    visibility: "public",
  },
  {
    pin_id: "table-moving",
    source_model_sha: GOLDEN_SHA256,
    source_frame: "file",
    position: [-3.21, 1.054, 2.054],
    normal: [0, -0.827, -0.563],
    title: "Tables scheduled to move",
    description:
      "Per the furniture layout, this row is scheduled to move out. Tables are tagged with a green “Sun Dvl” sticky; the photo shows one tagged table.",
    icon: "photo",
    content: [{ type: "photo", title: "Tagged table (underside)", url: `${C}/table-moving.jpg`, thumbnail: `${C}/table-moving-thumb.jpg` }],
    visibility: "public",
  },
  {
    pin_id: "fixture-cart",
    source_model_sha: GOLDEN_SHA256,
    source_frame: "file",
    position: [4.9, 1.128, -0.552],
    normal: [-1, 0, 0],
    title: "Fixture cart",
    description:
      "A perforated fixture cart tagged to move with the tables, photographed at this spot beside the whiteboard and door. The cart was not in the room when this capture was made.",
    icon: "photo",
    content: [{ type: "photo", title: "Fixture cart", url: `${C}/fixture-cart.jpg`, thumbnail: `${C}/fixture-cart-thumb.jpg` }],
    visibility: "public",
  },
  {
    pin_id: "table-staying",
    source_model_sha: GOLDEN_SHA256,
    source_frame: "file",
    position: [-1.81, 0.84, -2.641],
    normal: [0, -0.772, 0.636],
    title: "Tables staying in place",
    description: "Per the furniture layout, this row stays in Room 213. Staying tables carry a yellow “STAY” sticky; the photo shows one.",
    icon: "photo",
    content: [{ type: "photo", title: "Table tagged STAY", url: `${C}/table-staying.jpg`, thumbnail: `${C}/table-staying-thumb.jpg` }],
    visibility: "public",
  },
];

/** Content categories actually present in the pins — the UI never lists a category with no data behind it. */
export function presentContentTypes(pins: SpatialPin[]): PinContentType[] {
  return [...new Set(pins.flatMap((p) => p.content.map((c) => c.type)))];
}
