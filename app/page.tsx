import TileSection, { TileConfig } from "@/components/ui/TileSection";

const tiles: TileConfig[] = [
  {
    id: "slate360",
    eyebrow: "Slate360 · From Design to Reality",
    title: "Your vision, instantly realized.",
    subtitle:
      "Slate360 unifies BIM, 360 tours, analytics, VR, and geospatial tools into one command center for the built environment.",
    bullets: [
      "Access every workflow in one secure hub.",
      "Connect office and field teams in real time.",
      "Forecast risk, cost, and performance with AI.",
      "Plug into the tools and data you already use.",
    ],
    ctaLabel: "Request a demo",
    ctaHref: "/contact",
    viewerTitle: "Slate360 Viewer",
    viewerSubtitle: "Interactive tools and digital twins coming soon.",
  },
  {
    id: "bim",
    eyebrow: "Design Studio",
    title: "From point cloud to parametric models.",
    subtitle:
      "Ingest point clouds, LiDAR, and photogrammetry to generate editable BIM-style models ready for design and coordination.",
    bullets: [
      "Combine laser scans, photogrammetry, and survey control.",
      "Snapshot as-built conditions at every project milestone.",
      "Export to open formats for Revit, IFC, and more.",
      "Prepare models for 3D printing or VR with one pipeline.",
    ],
    ctaLabel: "Discover Design Studio",
    ctaHref: "/features#bim-studio",
    viewerTitle: "3D Model Workspace",
    viewerSubtitle:
      "Future demo: orbit, section, and measure your digital twin.",
  },
  {
    id: "project-hub",
    eyebrow: "Project Hub",
    title: "Orchestrate every project from one place.",
    subtitle:
      "Daily logs, RFIs, submittals, schedules, and cost tracking – all connected to your 3D context and 360 documentation.",
    bullets: [
      "Standardize project setup with reusable templates.",
      "Keep owners, GCs, and subs aligned in one workspace.",
      "Attach models, drawings, and field photos to every record.",
      "Export clean, client-ready status reports in a click.",
    ],
    ctaLabel: "Explore Project Hub",
    ctaHref: "/features#project-hub",
    viewerTitle: "Project Hub Timeline & Logs",
    viewerSubtitle: "See schedules, RFIs, and decisions in one timeline view.",
  },
  {
    id: "content",
    eyebrow: "Content Studio",
    title: "Turn raw captures into hero-ready media.",
    subtitle:
      "Edit drone footage, time-lapses, progress photos, and marketing video – all in a browser-based studio built for AEC teams.",
    bullets: [
      "Non-linear editing with branded templates and LUTs.",
      "Auto-cut sequences from flight logs and event markers.",
      "Batch-grade stills and time-lapse sequences.",
      "Publish directly to clients or social channels.",
    ],
    ctaLabel: "See Content Studio",
    ctaHref: "/features#content-studio",
    viewerTitle: "Media Timeline Preview",
    viewerSubtitle:
      "Future demo: trim, title, and grade in a single, simple UI.",
  },
  {
    id: "tour",
    eyebrow: "360 Tour Builder",
    title: "Walk every stakeholder through the site.",
    subtitle:
      "Build and host clickable 360° tours for construction, facilities, and marketing – no separate tour platform required.",
    bullets: [
      "Drag-and-drop tours from 360 photos and panoramas.",
      "Drop hotspots for drawings, RFIs, and assets.",
      "Share secure links or embed on your own site.",
      "Version tours as projects evolve over time.",
    ],
    ctaLabel: "Build a 360 Tour",
    ctaHref: "/features#tour-builder",
    viewerTitle: "Interactive 360 Tour",
    viewerSubtitle:
      "Future demo: move node-to-node and inspect every room.",
  },
  {
    id: "geospatial",
    eyebrow: "Geospatial & Robotics",
    title: "Map, measure, and automate the field.",
    subtitle:
      "Plan missions, process surveys, and calculate volumes with survey-grade accuracy – from drones, rovers, and scanners.",
    bullets: [
      "Design repeatable missions with RTK/PPK support.",
      "Fuse LiDAR, imagery, and survey control in one model.",
      "Compute cut/fill and material takeoffs in minutes.",
      "Simulate routes for ground and aerial robots.",
    ],
    ctaLabel: "Explore Geospatial Tools",
    ctaHref: "/features#geospatial",
    viewerTitle: "Survey & Volume Analysis",
    viewerSubtitle:
      "Future demo: measure stockpiles and earthworks in 3D.",
  },
  {
    id: "vr",
    eyebrow: "Virtual Studio",
    title: "Step inside your digital twin.",
    subtitle:
      "Spin up immersive review rooms from your models and scans so teams can walk, annotate, and plan in context.",
    bullets: [
      "Generate VR-ready scenes from Design Studio outputs.",
      "Stage furniture, equipment, and wayfinding scenarios.",
      "Capture walkthroughs for non-VR stakeholders.",
      "Reuse scenes for training, safety, and operations.",
    ],
    ctaLabel: "Preview Virtual Studio",
    ctaHref: "/features#vr-studio",
    viewerTitle: "Immersive Review Room",
    viewerSubtitle:
      "Future demo: explore a scanned space in full 3D & VR.",
  },
  {
    id: "analytics",
    eyebrow: "Analytics & Reports",
    title: "Translate data into decisions.",
    subtitle:
      "Pull together field data, models, and financials to generate clear, repeatable reports for executives and project teams.",
    bullets: [
      "Build reusable templates for owners, PMs, and trades.",
      "Blend schedule, cost, and risk into one narrative.",
      "Highlight hotspots directly on models or tours.",
      "Export polished PDFs or share live dashboards.",
    ],
    ctaLabel: "See Analytics in Action",
    ctaHref: "/features#analytics",
    viewerTitle: "Interactive Dashboards",
    viewerSubtitle:
      "Future demo: slice progress by trade, area, or system.",
  },
];

export default function Home() {
  return (
    <div className="space-y-0">
      {tiles.map((tile, index) => (
        <TileSection key={tile.id} tile={tile} index={index} />
      ))}
    </div>
  );
}