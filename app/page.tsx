import TileSection from "@/components/TileSection";

export default function HomePage() {
  return (
    // Dedicated snap container that scrolls the viewport area below the fixed header
    <div id="snap-container" className="snap-y snap-mandatory overflow-y-auto h-[calc(100vh-80px)]">
      <TileSection
        id="project-hub"
        title="Project Hub"
        subtitle="Daily logs, RFIs, submittals, observations, timecards, markups, and more."
        gradient="from-slate-900 via-slate-900 to-slate-800"
      />
      <TileSection
        id="bim-studio"
        title="BIM Studio"
        subtitle="Model viewing, annotations, measurements, issue tracking, and 3D print lab."
        gradient="from-slate-900 via-slate-800 to-slate-900"
      />
      <TileSection
        id="content-studio"
        title="Content Studio"
        subtitle="Video editing, media management, timelines, and rendering pipelines."
        gradient="from-slate-900 via-slate-900 to-slate-800"
      />
      <TileSection
        id="geospatial"
        title="Geospatial & Autonomous Robotics"
        subtitle="Flight planning, RTK/PPK, point clouds, and mission automation."
        gradient="from-slate-900 via-slate-800 to-slate-900"
      />
      <TileSection
        id="tour-builder"
        title="360 Tour Builder"
        subtitle="Upload stitched panos, link hotspots, publish on custom CloudFront URLs."
        gradient="from-slate-900 via-slate-900 to-slate-800"
      />
      <TileSection
        id="xr"
        title="Virtual & Augmented Reality"
        subtitle="XR viewer stubs here; swap with three/cesium/xeokit based on asset type."
        gradient="from-slate-900 via-slate-800 to-slate-900"
      />
      <TileSection
        id="reports"
        title="Reports & Analytics"
        subtitle="Dashboards, exports, and AI-assisted insights for stakeholders."
        gradient="from-slate-900 via-slate-900 to-slate-800"
      />
    </div>
  );
}