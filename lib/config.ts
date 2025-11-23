import { Tile } from "@/lib/types";

export const siteSections: Tile[] = [
  {
    id: "slate360",
    navLabel: "Slate360",
    eyebrow: "From design to reality",
    title: "Your vision, instantly realized.",
    subtitle:
      "Slate360 unifies BIM, 360° tours, analytics, VR, and geospatial tools into one secure workspace for the built environment.",
    bullets: [
      { label: "Unified command center", description: "Access every workflow without hopping between apps." },
      { label: "Field-to-office sync", description: "Connect HQ, field teams, and partners in real time." },
      { label: "Predictive intelligence", description: "Forecast risk, cost, and performance with AI." },
      { label: "Connected ecosystem", description: "Plug into the data sources and tools you already trust." },
    ],
    cta: { label: "Request a demo", href: "#contact" },
    secondaryCta: { label: "Get started", href: "/subscribe" },
    viewer: {
      title: "Slate360 Viewer",
      subtitle: "Interactive tools and digital twins are on deck.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#4FA9FF" },
  },
  {
    id: "design-studio",
    navLabel: "Design Studio",
    eyebrow: "Move beyond the desktop",
    title: "BIM ready for the browser.",
    subtitle:
      "Stream immersive 3D models from any device. No installs, no compatibility issues, just crystal-clear coordination.",
    bullets: [
      { label: "Cloud-native BIM", description: "High-fidelity rendering that performs on laptops and tablets." },
      { label: "Live markups", description: "Review clashes, comment in context, and keep teams aligned." },
      { label: "Version control", description: "Compare revisions instantly and roll back with confidence." },
    ],
    cta: { label: "Explore Design Studio", href: "/features/design" },
    secondaryCta: { label: "View roadmap", href: "/subscribe" },
    viewer: {
      title: "Realtime BIM Preview",
      subtitle: "Drop in models, iterate faster, and spotlight issues in seconds.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#A97142" },
  },
  {
    id: "project-hub",
    navLabel: "Project Hub",
    eyebrow: "Every stakeholder in sync",
    title: "One hub for mission control.",
    subtitle:
      "Dashboards, tasks, and activity feeds roll into a shared source of truth so every decision is grounded in reality.",
    bullets: [
      { label: "Context aware boards", description: "Tie tasks, RFIs, and issues directly to models and media." },
      { label: "Automation ready", description: "Trigger updates, alerts, and reports when data changes." },
      { label: "Audit friendly", description: "Time-stamped activity lets you defend every decision." },
    ],
    cta: { label: "See Project Hub", href: "/features/project-hub" },
    secondaryCta: { label: "Talk to product", href: "#contact" },
    viewer: {
      title: "Operations Console",
      subtitle: "Blend gantt charts, live site feeds, and approvals inside one screen.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#8CC5FF" },
  },
  {
    id: "content-studio",
    navLabel: "Content Studio",
    eyebrow: "Your story, beautifully told",
    title: "Produce cinematic updates in minutes.",
    subtitle:
      "Generate polished media directly inside Slate360. Cut drones, add captions, and ship branded reels instantly.",
    bullets: [
      { label: "Built-in editor", description: "Trim, layer, and color grade without leaving the browser." },
      { label: "Brand-safe presets", description: "Lock typography, lower thirds, and watermark rules." },
      { label: "Instant delivery", description: "Share secure links or publish straight to social." },
    ],
    cta: { label: "Learn about Content Studio", href: "/features/content-studio" },
    secondaryCta: { label: "Join beta", href: "/subscribe" },
    viewer: {
      title: "Media Workspace",
      subtitle: "Stack timelines, voiceover, and approvals in one view.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#FFB677" },
  },
  {
    id: "tour-builder",
    navLabel: "360 Tour Builder",
    eyebrow: "Immersive storytelling",
    title: "Transform site captures into guided tours.",
    subtitle:
      "Drag-and-drop 360° photos, add hotspots, and connect stakeholders to the field without boarding a plane.",
    bullets: [
      { label: "Hotspot editor", description: "Embed docs, checklists, and annotations in context." },
      { label: "VR ready", description: "Hand clients a headset and walk the site together." },
      { label: "Shareable links", description: "Secure viewer URLs with granular permissions." },
    ],
    cta: { label: "Discover Tour Builder", href: "/features/tour-builder" },
    secondaryCta: { label: "Request content sample", href: "#contact" },
    viewer: {
      title: "360° Preview",
      subtitle: "Tap anywhere to jump between scans or compare progress over time.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#4FA9FF" },
  },
  {
    id: "geospatial",
    navLabel: "Geospatial & Robotics",
    eyebrow: "Survey grade precision",
    title: "See every angle with centimeter accuracy.",
    subtitle:
      "Merge drone data, GNSS, robotics, and photogrammetry into a live geospatial twin of your project.",
    bullets: [
      { label: "LiDAR + GNSS", description: "Fuse point clouds, mesh models, and site scans automatically." },
      { label: "Robot ops", description: "Schedule autonomous flights or rover runs from anywhere." },
      { label: "Compliance ready", description: "Traceable datasets make regulator conversations simple." },
    ],
    cta: { label: "See Geospatial Tools", href: "/features/geospatial" },
    secondaryCta: { label: "Book a field test", href: "#contact" },
    viewer: {
      title: "Geospatial Console",
      subtitle: "Overlay flight paths, GNSS checkpoints, and volumetric analytics.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#22D3EE" },
  },
  {
    id: "virtual-studio",
    navLabel: "Virtual Studio",
    eyebrow: "Experience in true scale",
    title: "Bring clients inside the build.",
    subtitle:
      "Spin up VR/AR walkthroughs for design reviews, executive briefings, and stakeholder buy-in.",
    bullets: [
      { label: "Immersive reviews", description: "Walk full teams through decisions before ground is broken." },
      { label: "XR handoff", description: "Export to the devices and headsets you already own." },
      { label: "Story mode", description: "String scenes together for narrative-ready presentations." },
    ],
    cta: { label: "Experience Virtual Studio", href: "/features/virtual-studio" },
    secondaryCta: { label: "View sample deck", href: "/subscribe" },
    viewer: {
      title: "XR Stage",
      subtitle: "Preview immersive scenes, handoff to Quest, Vision Pro, or WebXR.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#C084FC" },
  },
  {
    id: "analytics",
    navLabel: "Analytics & Reports",
    eyebrow: "Insights that drive action",
    title: "Predict issues before they land on site.",
    subtitle:
      "Slate360 crunches schedule, budget, and sensor telemetry so your next move is backed by data, not guesswork.",
    bullets: [
      { label: "Predictive models", description: "Spot risk weeks in advance with AI scoring." },
      { label: "Custom dashboards", description: "Tailor KPIs to owners, subs, and executives." },
      { label: "Automated narratives", description: "Send weekly recaps written by copilots who know the work." },
    ],
    cta: { label: "Explore Analytics", href: "/features/analytics" },
    secondaryCta: { label: "Download sample report", href: "#contact" },
    viewer: {
      title: "Insight Board",
      subtitle: "Blend charts, geospatial overlays, and model callouts in seconds.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#FACC15" },
  },
];

export const siteNavLinks = siteSections.map(({ id, navLabel }) => ({ id, label: navLabel }));

export const siteConfig = {
  sections: siteSections,
  navLinks: siteNavLinks,
};
