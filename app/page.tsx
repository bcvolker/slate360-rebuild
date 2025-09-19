// Final, clean homepage implementation
'use client';
import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import Tile from '../components/ui/Tile';
import MediaWrapper from '../components/ui/MediaWrapper';
import SectionHeader from '../components/ui/SectionHeader';
import Footer from '../components/ui/Footer';
import Header from '../components/ui/Header';

const tileData = [
  { id: 'bim-studio', title: 'BIM Studio', dark: true, reverse: true, features: ['Cloud-Native 3D Viewer', 'Real-Time Collaboration', 'Version Control & Annotations', 'Automated Clash Detection'] },
  { id: 'project-hub', title: 'Project Hub', dark: false, reverse: false, features: ['Centralized Document Management', 'RFI & Submittal Tracking', 'Daily Logs & Reporting', 'Team & Task Coordination'] },
  { id: 'tour-builder', title: '360 Tour Builder', dark: true, reverse: true, features: ['Intuitive Drag-and-Drop Interface', 'Embed Hotspots & Rich Media', 'VR/AR Headset Compatibility', 'Shareable Public & Private Links'] },
  { id: 'content-creation', title: 'Content Creation', dark: false, reverse: false, features: ['AI-Powered Video Summaries', 'Automated Timeline Generation', 'Drone & Site Photo Management', 'Branded Content Exports'] },
  { id: 'geospatial', title: 'Geospatial & Robotics', dark: true, reverse: true, features: ['Live Cesium 3D Globe', 'Drone & Robot Data Integration', 'LiDAR Point Cloud Visualization', 'GNSS & Mission Planning'] },
  { id: 'reports', title: 'Reports & Analytics', dark: false, reverse: false, features: ['Customizable KPI Dashboards', 'Automated PDF/CSV Exports', 'Predictive Cost & Schedule Analysis', 'Stakeholder-Ready Visualizations'] },
  { id: 'vr-ar-lab', title: 'VR/AR Lab', dark: true, reverse: true, features: ['Immersive Design Review', 'On-Site AR Model Overlay', 'Virtual Safety Training Scenarios', 'Multi-User VR Collaboration'] },
];

export default function Page() {
  const [activeSection, setActiveSection] = useState<string | null>('hero');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>

      <Header activeSection={activeSection} />
  <main className="h-screen overflow-y-scroll snap-y snap-mandatory">
        {/* Hero Tile - larger viewer, split layout */}
        <Tile id="hero" ref={el => { sectionRefs.current['hero'] = el; }} className="bg-white">
          {/* Left: Large viewer */}
          <div className="flex flex-col w-full md:w-1/2 h-full p-4 md:p-8">
            <SectionHeader title="Slate360" subtitle="From Design to Reality" align="center" />
            <div className="w-[120%] h-[48vh] bg-red-100 flex items-start justify-center -mt-8 relative overflow-visible">
              <MediaWrapper type="iframe" src="https://your-main-3d-viewer.com" alt="Slate360 3D Viewer" className="w-full h-full rounded-xl shadow-lg mb-4" />
            </div>
            <p className="max-w-3xl mt-2 text-lg md:text-xl text-center">The all-in-one platform for AEC professionals.</p>
          </div>
          {/* Right: Empty for now, could add hero features or branding */}
          <div className="hidden md:block md:w-[40%]" />
        </Tile>

        {/* Feature Tiles - alternate viewer/text sides, viewer at top of side */}
        {tileData.map((tile, index) => {
          const viewerSide = tile.reverse ? 'right' : 'left';
          const textSide = tile.reverse ? 'left' : 'right';
          return (
            <Tile
              key={tile.id}
              id={tile.id}
              dark={tile.dark}
              reverse={tile.reverse}
              ref={el => { sectionRefs.current[tile.id] = el; }}
              className={clsx(index === tileData.length - 1 && "tile-last")}
            >
              {/* Viewer side */}
              <div className={clsx(
                'flex flex-col w-full md:w-1/2 h-full p-4 md:p-8',
                tile.reverse ? 'md:order-last' : ''
              )}>
                <div className="w-[120%] h-[48vh] bg-red-100 flex items-start justify-center -mt-8 relative overflow-visible">
                  <MediaWrapper alt={tile.title + ' media'} className="w-full h-full rounded-xl shadow-lg mb-4" />
                </div>
              </div>
              {/* Text/features side */}
              <div className="flex flex-col justify-start w-full h-full p-4 md:p-8">
                <SectionHeader title={tile.title} />
                <ul className="mt-4 space-y-2 text-left text-sm md:text-base">
                  {tile.features.map(feature => (
                    <li key={feature} className="flex items-center"><span className="text-brand-blue mr-2">✓</span>{feature}</li>
                  ))}
                </ul>
              </div>
            </Tile>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
