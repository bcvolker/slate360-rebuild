import {
  IconBuilding,
  IconCamera,
  IconCube,
  IconRoute,
  IconVideo,
  IconView360,
} from "@tabler/icons-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { IconProps } from "@tabler/icons-react";

type TablerIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
/** CSS custom property for app accent — never hardcode hex in consumers. */
export type AppAccentVar = "--graphite-primary" | "--twin360-blue";

export type ContentModeId = "walkthrough" | "360" | "3d" | "video" | "photo";

export type ContentMode = {
  id: ContentModeId;
  label: string;
  icon: TablerIcon;
  placeholderLabel: string;
};

export const CONTENT_MODES: ContentMode[] = [
  {
    id: "walkthrough",
    label: "Walkthrough",
    icon: IconRoute,
    placeholderLabel: "Cinematic walkthrough preview",
  },
  {
    id: "360",
    label: "360",
    icon: IconView360,
    placeholderLabel: "Immersive 360° panorama",
  },
  {
    id: "3d",
    label: "3D",
    icon: IconCube,
    placeholderLabel: "Interactive 3D space",
  },
  {
    id: "video",
    label: "Video",
    icon: IconVideo,
    placeholderLabel: "Field or studio video clip",
  },
  {
    id: "photo",
    label: "Photo",
    icon: IconCamera,
    placeholderLabel: "Contextual field photograph",
  },
];

export type Slate360App = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  accentVar: AppAccentVar;
  icon: TablerIcon;
  salesTiles: { title: string; description: string }[];
};

/** Single source of truth — append one entry to add a future app. */
export const SLATE360_APPS: Slate360App[] = [
  {
    id: "site-walk",
    slug: "site-walk",
    name: "Site Walk",
    tagline: "Field documentation & project management",
    accentVar: "--graphite-primary",
    icon: IconBuilding,
    salesTiles: [
      {
        title: "Capture with drawings / field docs",
        description:
          "Pin observations to blueprint overlays, capture photos with timestamps, and build a geolocated record as you walk the site.",
      },
      {
        title: "Project coordination — PM suite, RFIs, submittals",
        description:
          "Run RFIs, submittals, punch lists, and daily logs from the same project workspace your field team already uses.",
      },
    ],
  },
  {
    id: "twin-360",
    slug: "twin-360",
    name: "Twin 360",
    tagline: "3D reality capture, inspection & digital twins",
    accentVar: "--twin360-blue",
    icon: IconCube,
    salesTiles: [
      {
        title: "Capture & share 3D spaces",
        description:
          "Collect 360°, photogrammetry, and LiDAR data on site, then share secure immersive links with clients and stakeholders.",
      },
      {
        title: "Edit & deliver cinematic walkthroughs",
        description:
          "Refine camera paths, add annotations, and publish branded walkthroughs without leaving the Slate360 ecosystem.",
      },
    ],
  },
];

export const SYNERGY_TILE = {
  title: "Use them together",
  description:
    "Attach a Twin 360 to any Site Walk project for spatial context, or seed a new Twin from Site Walk photos. One portfolio, two capture workflows.",
} as const;

/** Resolved accent color for inline styles — always a CSS var reference. */
export function appAccentStyle(accentVar: AppAccentVar): { color: string; borderColor: string } {
  return {
    color: `var(${accentVar})`,
    borderColor: `color-mix(in srgb, var(${accentVar}) 35%, transparent)`,
  };
}

export const MARKETING_CANVAS_VAR = "--graphite-canvas";
