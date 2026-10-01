export type CreateTile = {
  id: string;
  href: string;
  title: string;
  use: string;
  group: "document" | "space" | "analysis" | "media" | "import";
  soon?: boolean;
};

export const CREATE_TILES: CreateTile[] = [
  { id: "walk", href: "/spatial-walkthrough", title: "Spatial Walkthrough", use: "Publish a 360 walk clients can look through.", group: "document" },
  { id: "twin", href: "/digital-twins", title: "Digital Twin", use: "Reconstruct a measured space from capture.", group: "space" },
  { id: "site-walk", href: "/site-walks", title: "Site Walk", use: "Capture photos, notes, and pins on a plan.", group: "document" },
  { id: "thermal", href: "/thermal-studio", title: "Thermal Analysis", use: "Review infrared captures as a report.", group: "analysis" },
  { id: "tour", href: "/tours", title: "360 Tour", use: "Assemble still panoramas into a tour.", group: "space" },
];

export const CREATE_GROUPS: Array<{ id: CreateTile["group"]; label: string }> = [
  { id: "document", label: "Visual documentation" },
  { id: "space", label: "Digital space" },
  { id: "analysis", label: "Analysis" },
];
