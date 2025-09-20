
"use client";
import { useState, useEffect, useRef } from 'react';
import TileSection from '../components/TileSection';
import TileScroller from '../components/TileScroller';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';

export default function PageClient() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0.5 }
    );
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  const tileData = [
    { id: "slate360", title: "Slate360", subtitle: "From Design to Reality", description: "A platform revolutionizing AEC with 3D tools.", features: ["Unified platform", "Real-time collaboration"], learnHref: "/about", viewerOn: "right", alt: false, hero: true },
    { id: "bim", title: "BIM Studio", subtitle: "Advanced Modeling", description: "Precision BIM editing and sequencing.", features: ["Cloud-Native 3D Viewer", "Real-Time Collaboration"], learnHref: "/dashboard/bim", viewerOn: "left", alt: true },
    { id: "project-hub", title: "Project Hub", subtitle: "Centralized Management", description: "Real-time tracking and team coordination.", features: ["RFI Tracking", "Document Control"], learnHref: "/dashboard/project-hub", viewerOn: "right", alt: false },
    { id: "tour", title: "360 Tour Builder", subtitle: "Immersive Walkthroughs", description: "Interactive tours with annotations.", features: ["Hotspot Tools", "VR Support"], learnHref: "/dashboard/tours", viewerOn: "left", alt: true },
    { id: "content", title: "Content Creation", subtitle: "Media Production", description: "AI-enhanced video editing.", features: ["Magnetic Timeline", "Branding"], learnHref: "/dashboard/content", viewerOn: "right", alt: false },
    { id: "geo", title: "Geospatial & Robotics", subtitle: "Automation Mapping", description: "Mission planning and data integration.", features: ["Live Cesium Globe", "Drone Data"], learnHref: "/dashboard/geospatial", viewerOn: "left", alt: true },
    { id: "reports", title: "Reports & Analytics", subtitle: "Data Insights", description: "Customizable analytics reports.", features: ["KPI Dashboards", "Thermal Analysis"], learnHref: "/dashboard/reports", viewerOn: "right", alt: false },
    { id: "vr", title: "VR/AR Lab", subtitle: "Immersive Simulation", description: "1:1 scale design reviews.", features: ["Safety Simulation", "Multi-User"], learnHref: "/dashboard/vr", viewerOn: "left", alt: true },
  ];

  return (
    <div className="h-screen overflow-y-scroll snap-y snap-mandatory">
      <Navbar />
      <TileScroller />
      <main className="pt-12">
        {tileData.map((tile, index) => {
          // For dark tiles (alt: false), make viewer 25% smaller
          const isDark = !tile.alt;
          let viewerStyle: React.CSSProperties = {};
          if (isDark) {
            // Make square: width = height, 15% larger than before
            const size = '43.125vw'; // 37.5vw * 1.15
            viewerStyle = {
              width: size,
              height: size,
              maxWidth: '621px', // 540px * 1.15
              maxHeight: '621px',
            };
            if (index === 0) {
              // For the first tile, use the smaller of width or height for both
              viewerStyle.width = viewerStyle.height = 'min(43.125vw, calc((70vh - 0.75in) * 0.75 * 1.15), 621px)';
              viewerStyle.maxWidth = viewerStyle.maxHeight = '621px';
            }
          }
          return (
            <TileSection
              key={tile.id}
              id={tile.id}
              title={tile.title}
              subtitle={tile.subtitle}
              description={tile.description}
              features={tile.features}
              learnHref={tile.learnHref}
              viewerOn={tile.viewerOn as 'left' | 'right' | undefined}
              alt={tile.alt}
              hero={tile.hero}
              viewerStyle={viewerStyle}
              viewerLeft={index === 0}
            />
          );
        })}
        <Footer />
      </main>
    </div>
  );
}
