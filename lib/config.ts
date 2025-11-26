import { Tile } from "@/lib/types";

export const siteSections: Tile[] = [
  {
    id: "slate360",
    navLabel: "Slate360",
    eyebrow: "The Operating System for the Built Environment",
    title: "Slate360",
    subtitle:
      "From design to reality. Unify your entire project lifecycle with the only platform that connects BIM, reality capture, and field operations.",
    bullets: [
      {
        label: "One platform, every tool",
        description: "Replace disconnected point solutions with a single unified ecosystem.",
      },
      {
        label: "Seamless data flow",
        description: "Move from design to construction to operations without data loss.",
      },
      {
        label: "Real-time collaboration",
        description: "Connect office, field, and stakeholders instantly.",
      },
      {
        label: "Enterprise security",
        description: "Bank-grade encryption and role-based access control.",
      },
      {
        label: "Open API",
        description: "Integrate with your existing ERP and scheduling tools.",
      },
      {
        label: "Device agnostic",
        description: "Works on any browser, tablet, or mobile device.",
      },
    ],
    cta: { label: "Start Free Trial", href: "/subscribe" },
    secondaryCta: { label: "Contact Sales", href: "#contact" },
    viewer: {
      title: "Welcome to Slate360",
      subtitle: "Explore the future of construction technology.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#4F89D4" },
    tone: "primary",
  },
  {
    id: "design-studio",
    navLabel: "Design Studio",
    eyebrow: "Cloud-Native BIM Design",
    title: "Design Studio",
    subtitle:
      "View, annotate, compare, and collaborate on 3D designs from any device directly in the browser.",
    bullets: [
      {
        label: "High-fidelity model viewing",
        description: "Stream high-detail 3D and design files directly in the browser.",
      },
      {
        label: "Live markups",
        description: "Draw, comment, and annotate in context with your team.",
      },
      {
        label: "Smart measurements",
        description: "Measure distance, area, volume, and clearances in seconds.",
      },
      {
        label: "Model comparison",
        description: "Highlight changes between revisions instantly.",
      },
      {
        label: "Issue tagging",
        description: "Add notes and issues directly onto geometry and views.",
      },
      {
        label: "Layer controls",
        description: "Isolate systems or disciplines with granular visibility settings.",
      },
    ],
    cta: { label: "Explore BIM Studio", href: "/features/design" },
    secondaryCta: { label: "Get started", href: "/subscribe" },
    viewer: {
      title: "Realtime BIM Preview",
      subtitle: "Drop in models, iterate faster, and spotlight issues in seconds.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#B37031" },
    tone: "alt",
  },
  {
    id: "project-hub",
    navLabel: "Project Hub",
    eyebrow: "Operational Command Center",
    title: "Project Hub",
    subtitle:
      "Keep every project, team member, file, note, and workflow connected in one secure workspace.",
    bullets: [
      {
        label: "Unified project dashboard",
        description: "See everything happening across your programs at a glance.",
      },
      {
        label: "Tasks & observations",
        description: "Capture field notes, issues, and progress in real time.",
      },
      {
        label: "Schedule tracking",
        description: "View timelines, dependencies, and milestones.",
      },
      {
        label: "Document management",
        description: "Keep drawings, photos, PDFs, and reports organized.",
      },
      {
        label: "Field-to-office sync",
        description: "Updates appear instantly for all teammates.",
      },
      {
        label: "Role-based visibility",
        description: "Show or hide tools based on access level.",
      },
    ],
    cta: { label: "See Project Hub", href: "/features/project-hub" },
    secondaryCta: { label: "Get started", href: "/subscribe" },
    viewer: {
      title: "Project Hub Overview",
      subtitle: "Glanceable dashboards, live tasks, and activity streams in one place.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#4F89D4" },
    tone: "primary",
  },
  {
    id: "tour-builder",
    navLabel: "360 Tour Builder",
    eyebrow: "Interactive 360° Experiences",
    title: "360 Tour Builder",
    subtitle:
      "Transform captured spaces into interactive tours for progress updates, training, and marketing.",
    bullets: [
      {
        label: "Drag-and-drop tour building",
        description: "Upload panoramas and auto-connect scenes with a guided flow.",
      },
      {
        label: "Interactive hotspots",
        description: "Attach notes, links, labels, PDFs, videos, or model callouts.",
      },
      {
        label: "Floorplan overlay mode",
        description: "Navigate using 2D layouts layered over your tours.",
      },
      {
        label: "Before/after mode",
        description: "Compare two captures inside a single tour.",
      },
      {
        label: "Measurement tools",
        description: "Approximate distances and dimensions inside panoramas.",
      },
      {
        label: "Custom branding",
        description: "Apply your logo, color palette, and watermark.",
      },
    ],
    cta: { label: "Discover Tour Builder", href: "/features/tour-builder" },
    secondaryCta: { label: "Get started", href: "/subscribe" },
    viewer: {
      title: "360 Tour Preview",
      subtitle: "Click through hotspots, floorplans, and guided walkthroughs in one place.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#B37031" },
    tone: "alt",
  },
  {
    id: "geospatial",
    navLabel: "Geospatial & Robotics",
    eyebrow: "Drone & LiDAR Mapping",
    title: "Geospatial & Autonomous Robotics",
    subtitle:
      "Capture the world with drones, LiDAR, and mapping tools for aerial mapping, interior scanning, and progress verification.",
    bullets: [
      {
        label: "Photogrammetry-ready storage",
        description: "Keep imagery and scans organized for downstream processing.",
      },
      {
        label: "Drone mission management",
        description: "Upload flight logs, images, and LiDAR scans in one place.",
      },
      {
        label: "Interactive maps",
        description: "View footprints, GCPs, and annotated areas on web maps.",
      },
      {
        label: "Area, volume, and elevation tools",
        description: "Measure cut/fill, heights, and contours from your data.",
      },
      {
        label: "3D point cloud viewers",
        description: "Inspect LAS, E57, and PLY point clouds directly in the browser.",
      },
      {
        label: "Georeferenced overlays",
        description: "Compare as-built conditions to design on a shared map.",
      },
    ],
    cta: { label: "See Geospatial Tools", href: "/features/geospatial" },
    secondaryCta: { label: "Get started", href: "/subscribe" },
    viewer: {
      title: "Geospatial Console",
      subtitle: "View missions, maps, and volumetric analytics from a single screen.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#4F89D4" },
    tone: "primary",
  },
  {
    id: "virtual-studio",
    navLabel: "Virtual Studio",
    eyebrow: "WebXR Immersive Reality",
    title: "Virtual Studio",
    subtitle:
      "Turn models and tours into immersive VR and AR experiences directly in the browser.",
    bullets: [
      {
        label: "VR mode (WebXR)",
        description: "Explore models or scans in immersive first-person.",
      },
      {
        label: "AR placement",
        description: "View objects or models in the real world using mobile devices.",
      },
      {
        label: "Path walkthroughs",
        description: "Simulate routes and movement through designs or captures.",
      },
      {
        label: "Lighting & environment changes",
        description: "Preview models under different conditions.",
      },
      {
        label: "Model simplification",
        description: "Optimize large files so VR sessions stay smooth.",
      },
      {
        label: "Training mode",
        description: "Create role-based guided simulations for teams.",
      },
    ],
    cta: { label: "Experience Virtual Studio", href: "/features/virtual-studio" },
    secondaryCta: { label: "Get started", href: "/subscribe" },
    viewer: {
      title: "Immersive Preview",
      subtitle: "Step into models, scans, and tours using WebXR-ready scenes.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#B37031" },
    tone: "alt",
  },
  {
    id: "analytics",
    navLabel: "Reports & Analytics",
    eyebrow: "Data-Driven Insights",
    title: "Analytics & Reports",
    subtitle:
      "Turn your data into dashboards and decisions with visualizations and exportable reports backed by real-world data.",
    bullets: [
      {
        label: "Automated dashboards",
        description: "Track progress, safety, schedule, and quality trends.",
      },
      {
        label: "Cross-tab analytics",
        description: "Blend model, drone, and project data in unified views.",
      },
      {
        label: "Forecasting",
        description: "Predict cost, timeline, productivity, and risk.",
      },
      {
        label: "AI insights",
        description: "Get automatic summaries and recommendations.",
      },
      {
        label: "PDF & CSV export",
        description: "Generate professional-grade, shareable reports.",
      },
      {
        label: "Executive overview",
        description: "Give leaders a high-level snapshot of every program.",
      },
    ],
    cta: { label: "Explore Reports & Analytics", href: "/features/analytics" },
    secondaryCta: { label: "Get started", href: "/subscribe" },
    viewer: {
      title: "Analytics Board",
      subtitle: "Visualize KPIs, trends, and site telemetry from a single view.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#4F89D4" },
    tone: "primary",
  },
];

export const siteNavLinks = siteSections.map(({ id, navLabel }) => ({ id, label: navLabel }));

export const siteConfig = {
  sections: siteSections,
  navLinks: siteNavLinks,
};
