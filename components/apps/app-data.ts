import {
  Compass,
  ClipboardCheck,
  Map,
  BarChart3,
  Camera,
  Layers,
  type LucideIcon,
} from "lucide-react";

export type AppId = "tour_builder" | "punchwalk" | "site_mapper" | "analytics" | "photo_doc" | "model_viewer";

export interface AppDefinition {
  id: AppId;
  name: string;
  tagline: string;
  description: string;
  price: string;
  icon: LucideIcon;
  color: string;
  features: string[];
  available: boolean;
}

export const APPS: AppDefinition[] = [
  {
    id: "tour_builder",
    name: "Tour Builder",
    tagline: "Immersive 360° virtual tours",
    description:
      "Create and host interactive 360° virtual tours for your construction projects. Embed hotspots, annotations, and navigation markers. Share via link or embed on your website.",
    price: "$49/mo",
    icon: Compass,
    color: "var(--module-tours)",
    features: [
      "Drag-and-drop tour editor",
      "Hotspot annotations",
      "Embeddable player",
      "Client sharing links",
      "Custom branding overlays",
    ],
    available: true,
  },
  {
    id: "punchwalk",
    name: "PunchWalk",
    tagline: "Field punch lists, simplified",
    description:
      "Digitize your punch list and field walkthrough process. Mark up floor plans with items, assign to trades, and track resolution in real time.",
    price: "$49/mo",
    icon: ClipboardCheck,
    color: "var(--module-hub)",
    features: [
      "Floor plan markup",
      "Photo attachments per item",
      "Trade assignment & tracking",
      "Due date notifications",
      "Export to PDF",
    ],
    available: true,
  },
  {
    id: "site_mapper",
    name: "Site Mapper",
    tagline: "Geospatial context for every project",
    description:
      "Overlay project data onto satellite imagery. Visualize progress, mark up areas of concern, and share annotated maps with stakeholders.",
    price: "$39/mo",
    icon: Map,
    color: "var(--module-geo)",
    features: [
      "Satellite base layers",
      "Polygon annotations",
      "Progress timeline",
      "Measurement tools",
      "Stakeholder sharing",
    ],
    available: false,
  },
  {
    id: "analytics",
    name: "Analytics",
    tagline: "Project intelligence dashboard",
    description:
      "Unified analytics across all your Slate360 modules. Track progress, budget, schedule performance, and team velocity in one view.",
    price: "$29/mo",
    icon: BarChart3,
    color: "var(--module-analytics)",
    features: [
      "Cross-module metrics",
      "Custom date ranges",
      "Export CSV / PDF",
      "Scheduled email reports",
      "Team activity feed",
    ],
    available: false,
  },
  {
    id: "photo_doc",
    name: "Photo Doc",
    tagline: "Structured photo documentation",
    description:
      "Capture, organize, and annotate construction photos with automatic metadata tagging. Link photos to specific project milestones.",
    price: "$29/mo",
    icon: Camera,
    color: "var(--module-content)",
    features: [
      "Auto GPS & timestamp tagging",
      "Milestone linking",
      "Annotation tools",
      "Bulk upload from mobile",
      "Client-ready albums",
    ],
    available: false,
  },
  {
    id: "model_viewer",
    name: "Model Viewer",
    tagline: "3D model hosting & collaboration",
    description:
      "Upload and share 3D models directly in the browser. Supports IFC, glTF, OBJ, and FBX formats with measurement and annotation tools.",
    price: "$59/mo",
    icon: Layers,
    color: "var(--module-virtual)",
    features: [
      "IFC / glTF / OBJ / FBX support",
      "Browser-based viewer",
      "Measurement tools",
      "Collaborative annotations",
      "Version comparison",
    ],
    available: false,
  },
];
