
"use client";


import TileSection from '../components/TileSection';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import Image from 'next/image';
export default function PageClient() {
  const tileData = [
    { id: "slate360", title: "Slate360", subtitle: "From Design to Reality", description: "A platform revolutionizing AEC with 3D tools.", features: ["Unified platform", "Real-time collaboration"], learnHref: "/about", viewerOn: "right" as const, hero: true },
    { id: "bim", title: "BIM Studio", subtitle: "Advanced Modeling", description: "Precision BIM editing and sequencing.", features: ["Cloud-Native 3D Viewer", "Real-Time Collaboration"], learnHref: "/dashboard/bim", viewerOn: "left" as const },
    { id: "project-hub", title: "Project Hub", subtitle: "Centralized Management", description: "Real-time tracking and team coordination.", features: ["RFI Tracking", "Document Control"], learnHref: "/dashboard/project-hub", viewerOn: "right" as const },
    { id: "tour", title: "360 Tour Builder", subtitle: "Immersive Walkthroughs", description: "Interactive tours with annotations.", features: ["Hotspot Tools", "VR Support"], learnHref: "/dashboard/tours", viewerOn: "left" as const },
    { id: "content", title: "Content Creation", subtitle: "Media Production", description: "AI-enhanced video editing.", features: ["Magnetic Timeline", "Branding"], learnHref: "/dashboard/content", viewerOn: "right" as const },
    { id: "geo", title: "Geospatial & Robotics", subtitle: "Automation Mapping", description: "Mission planning and data integration.", features: ["Live Cesium Globe", "Drone Data"], learnHref: "/dashboard/geospatial", viewerOn: "left" as const },
    { id: "reports", title: "Reports & Analytics", subtitle: "Data Insights", description: "Customizable analytics reports.", features: ["KPI Dashboards", "Thermal Analysis"], learnHref: "/dashboard/reports", viewerOn: "right" as const },
    { id: "vr", title: "VR/AR Lab", subtitle: "Immersive Simulation", description: "1:1 scale design reviews.", features: ["Safety Simulation", "Multi-User"], learnHref: "/dashboard/vr", viewerOn: "left" as const },
  ];


  return (
    <>
      {/* Debug: Render logo image at very top of page */}
      <div className="h-screen overflow-y-scroll snap-y snap-mandatory">
        <Navbar />
        <main className="pt-12">
          {tileData.map((tile) => (
            <TileSection key={tile.id} {...tile} />
          ))}
          <Footer />
        </main>
      </div>
    </>
  );
}
