import { FolderOpen, Cpu, Users, ScanLine } from "lucide-react";
import { createElement } from "react";

/* ── 7 platform cards (exact dashboard sidebar order) ──── */
export const platforms = [
  {
    key: "project-hub",
    href: "/project-hub",
    label: "Manage",
    title: "Project Hub",
    desc: "Command center for every project — RFIs, submittals, budgets, schedules, and team coordination in one place.",
    accent: "#FF4D00",
    bg: "from-zinc-50 to-white",
  },
  {
    key: "design-studio",
    icon: "✏️",
    label: "Design",
    title: "Design Studio",
    desc: "Context-aware 3D modeling, 2D plan markup, fabrication prep, and version control — one workspace that adapts to your task.",
    href: "/features/design-studio",
    accent: "#FF4D00",
    bg: "from-orange-50 to-white",
  },
  {
    key: "content-studio",
    icon: "🎨",
    label: "Create",
    title: "Content Studio",
    desc: "Create marketing materials, client presentations, and polished deliverables directly from your project data.",
    href: "/features/content-studio",
    accent: "#FF4D00",
    bg: "from-orange-50 to-white",
  },
  {
    key: "360-tour-builder",
    icon: "🔭",
    label: "Visualize",
    title: "360 Tour Builder",
    desc: "Capture and share immersive 360° walkthroughs of any site, structure, or space. Embed anywhere.",
    href: "/features/360-tour-builder",
    accent: "#FF4D00",
    bg: "from-zinc-50 to-white",
  },
  {
    key: "geospatial-robotics",
    icon: "🛰️",
    label: "Survey",
    title: "Geospatial & Robotics",
    desc: "Drone mapping, photogrammetry, LiDAR point clouds, and volumetric calculations — fully automated.",
    href: "/features/geospatial-robotics",
    accent: "#FF4D00",
    bg: "from-orange-50 to-white",
  },
  {
    key: "virtual-studio",
    icon: "🎬",
    label: "Present",
    title: "Virtual Studio",
    desc: "Photorealistic renderings, fly-through animations, and client-ready presentations from your 3D models.",
    href: "/features/virtual-studio",
    accent: "#FF4D00",
    bg: "from-zinc-50 to-white",
  },
  {
    key: "analytics-reports",
    icon: "📊",
    label: "Analyze",
    title: "Analytics & Reports",
    desc: "Project dashboards, credit consumption trends, portfolio-level insights, and exportable reports.",
    href: "/features/analytics-reports",
    accent: "#FF4D00",
    bg: "from-orange-50 to-white",
  },
  {
    key: "slate360-apps",
    icon: "🧩",
    label: "Extend",
    title: "Slate360 Apps",
    desc: "Downloadable and subscribable apps that integrate seamlessly — one login, one file system, one subscription.",
    href: "/features/ecosystem-apps",
    accent: "#FF4D00",
    bg: "from-zinc-50 to-white",
  },
];

/* ── "More powerful tools" cards ────────────────────────── */
export const moreTools = [
  {
    icon: createElement(FolderOpen, { size: 22 }),
    title: "SlateDrop",
    desc: "Mac Finder-style file system. Drag & drop, right-click Secure Send, auto-project folders, ZIP closeout.",
    href: "/features/slatedrop",
  },
  {
    icon: createElement(Cpu, { size: 22 }),
    title: "GPU-Powered Processing",
    desc: "Server-side rendering, file conversion, and heavy computation — offloaded so your machine stays fast.",
    href: "/features/gpu-processing",
  },
  {
    icon: createElement(Users, { size: 22 }),
    title: "Easy Collaboration & Sharing",
    desc: "Share links, comment threads, real-time co-editing, and permission-based access for every stakeholder.",
    href: "/features/collaboration",
  },
  {
    icon: createElement(ScanLine, { size: 22 }),
    title: "Digital Twin Creation",
    desc: "Gaussian Splatting & NeRF options to build photorealistic digital twins from photos or LiDAR scans.",
    href: "/features/digital-twins",
  },
];

/* ── Pricing tiers ──────────────────────────────────────── */
export const plans = [
  {
    name: "Creator",
    price: "$79",
    annualPrice: "$66",
    desc: "For visual content creators and solo operators.",
    features: [
      "360 Tour Builder",
      "Virtual Studio",
      "40 GB storage",
      "6,000 credits/mo",
    ],
  },
  {
    name: "Model",
    price: "$199",
    annualPrice: "$166",
    desc: "For advanced modelers, architects, and drone operators.",
    features: [
      "Design Studio",
      "Geospatial & Robotics",
      "150 GB storage",
      "15,000 credits/mo",
    ],
  },
  {
    name: "Business",
    price: "$499",
    annualPrice: "$416",
    desc: "Full platform access for teams.",
    features: [
      "All modules",
      "Project Hub",
      "750 GB storage",
      "30,000 credits/mo",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    annualPrice: "Custom",
    desc: "For large firms, multi-team orgs, and government.",
    features: [
      "Everything in Business",
      "Seat management & SSO",
      "Custom storage & credits",
      "Dedicated support SLA",
    ],
  },
];
