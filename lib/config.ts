import { Tile } from "@/lib/types";

export const siteSections: Tile[] = [
  {
    id: "slate360",
    navLabel: "Project Hub",
    eyebrow: "Project Hub",
    title: "Your operational command center.",
    subtitle:
      "Keep every project, team member, file, note, and workflow connected in one secure workspace. The Project Hub brings structure to fast-moving programs while staying flexible for any discipline or team size.",
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
    secondaryCta: { label: "Get started", href: "#contact" },
    viewer: {
      title: "Project Hub Overview",
      subtitle: "Glanceable dashboards, live tasks, and activity streams in one place.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#4F89D4" },
  },
  {
    id: "design-studio",
    navLabel: "BIM / Design Studio",
    eyebrow: "BIM / Design Studio",
    title: "A cloud-native BIM environment for the browser.",
    subtitle:
      "View, annotate, compare, and collaborate on 3D models from any device—without installs, hardware limits, or complexity.",
    bullets: [
      {
        label: "High-fidelity model viewing",
        description: "Stream IFC, OBJ, GLB, and RVT-converted models directly in the browser.",
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
        description: "Add notes and issues directly onto model geometry.",
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
  },
  {
    id: "content-studio",
    navLabel: "Content Studio",
    eyebrow: "Content Studio",
    title: "Your media lab for field and marketing teams.",
    subtitle:
      "Upload, edit, enhance, and organize photo and video content—powered by cloud tools and AI assistance.",
    bullets: [
      {
        label: "Basic editing tools",
        description: "Crop, color correct, trim, and sharpen directly in the browser.",
      },
      {
        label: "Photo & video library",
        description: "Automatically organize media by project and source.",
      },
      {
        label: "AI enhancements",
        description: "Auto-stabilize, upscale, and clean noise from your footage.",
      },
      {
        label: "Timelapse builder",
        description: "Generate timelapses from photos or clips in a few clicks.",
      },
      {
        label: "Side-by-side comparison",
        description: "Compare progress or revisions on a single screen.",
      },
      {
        label: "Voiceover & caption tools",
        description: "Create explainers and updates without leaving the platform.",
      },
    ],
    cta: { label: "Learn about Content Studio", href: "/features/content-studio" },
    secondaryCta: { label: "Get started", href: "/subscribe" },
    viewer: {
      title: "Content Studio Workspace",
      subtitle: "Edit, enhance, and approve media where the rest of your work lives.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#4F89D4" },
  },
  {
    id: "tour-builder",
    navLabel: "360 Tour Builder",
    eyebrow: "360 Tour Builder",
    title: "Transform captured spaces into interactive tours.",
    subtitle:
      "Upload panoramas, connect scenes, and share immersive, navigable environments for progress updates, training, and marketing.",
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
    secondaryCta: { label: "Get started", href: "#contact" },
    viewer: {
      title: "360 Tour Preview",
      subtitle: "Click through hotspots, floorplans, and guided walkthroughs in one place.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#B37031" },
  },
  {
    id: "geospatial",
    navLabel: "Geospatial & Robotics",
    eyebrow: "Geospatial & Autonomous Robotics",
    title: "Capture the world with drones, LiDAR, and mapping tools.",
    subtitle:
      "Whether it’s aerial mapping, interior scanning, or progress verification, Slate360 brings field intelligence into one platform.",
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
    secondaryCta: { label: "Get started", href: "#contact" },
    viewer: {
      title: "Geospatial Console",
      subtitle: "View missions, maps, and volumetric analytics from a single screen.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#4F89D4" },
  },
  {
    id: "virtual-studio",
    navLabel: "VR / AR Studio",
    eyebrow: "Virtual & Augmented Reality Studio",
    title: "Turn models and tours into immersive experiences.",
    subtitle:
      "Explore designs, scans, and tours in VR and AR without engines or bulky software—just WebXR in the browser.",
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
    cta: { label: "Experience VR / AR Studio", href: "/features/virtual-studio" },
    secondaryCta: { label: "Get started", href: "/subscribe" },
    viewer: {
      title: "Immersive Preview",
      subtitle: "Step into models, scans, and tours using WebXR-ready scenes.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#B37031" },
  },
  {
    id: "analytics",
    navLabel: "Reports & Analytics",
    eyebrow: "Reports & Analytics",
    title: "Turn your data into dashboards and decisions.",
    subtitle:
      "Transform models, tours, tasks, and scans into dashboards, visualizations, and exportable reports backed by real-world data.",
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
    secondaryCta: { label: "Get started", href: "#contact" },
    viewer: {
      title: "Analytics Board",
      subtitle: "Visualize KPIs, trends, and site telemetry from a single view.",
    },
    layout: { align: "right", snap: true },
    theme: { accent: "#4F89D4" },
  },
  {
    id: "platform",
    navLabel: "Slate360 Platform",
    eyebrow: "From design to reality",
    title: "Your vision, instantly realized.",
    subtitle:
      "Slate360 unifies Project Hub, BIM, tours, media, geospatial, VR/AR, and analytics into one secure workspace for the built environment.",
    bullets: [
      {
        label: "Unified workspace",
        description: "Keep every workflow connected as a single platform.",
      },
      {
        label: "Cross-tool linking",
        description: "Connect models, tours, scans, and reports with a few clicks.",
      },
      {
        label: "Role-aware access",
        description: "Give each team the tools and visibility they need.",
      },
      {
        label: "Automation ready",
        description: "Hook into your existing stack and trigger workflows automatically.",
      },
      {
        label: "Future-proof foundation",
        description: "Add new modules and capabilities without replatforming.",
      },
      {
        label: "Enterprise-grade security",
        description: "Protect design, field, and operational data with confidence.",
      },
    ],
    cta: { label: "Explore the Slate360 Platform", href: "#contact" },
    secondaryCta: { label: "Get started", href: "/subscribe" },
    viewer: {
      title: "Slate360 Platform View",
      subtitle: "See how every module connects across your projects.",
    },
    layout: { align: "left", snap: true },
    theme: { accent: "#B37031" },
  },
];

export const siteNavLinks = siteSections.map(({ id, navLabel }) => ({ id, label: navLabel }));

export const siteConfig = {
  sections: siteSections,
  navLinks: siteNavLinks,
};
