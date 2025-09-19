// Overwrite with corrected code
'use client';
import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import Tile from '../components/ui/Tile';
import MediaWrapper from '../components/ui/MediaWrapper';
import SectionHeader from '../components/ui/SectionHeader';
import Footer from '../components/ui/Footer';
import Header from '../components/ui/Header';

const tileData = [
  { id: 'bim-studio', title: 'BIM Studio', dark: true, reverse: true, features: ['Cloud-Native 3D Viewer', 'Real-Time Collaboration', 'Version Control & Annotations', 'Automated Clash Detection'], viewer: { type: 'iframe' as const, src: 'https://your-3d-viewer-url.com' } },
  { id: 'project-hub', title: 'Project Hub', dark: false, reverse: false, features: ['Centralized Document Management', 'RFI & Submittal Tracking', 'Daily Logs & Reporting', 'Team & Task Coordination'], viewer: { type: 'image' as const, src: '/charts/analytics.png' } },
  { id: 'tour-builder', title: '360 Tour Builder', dark: true, reverse: true, features: ['Intuitive Drag-and-Drop Interface', 'Embed Hotspots & Rich Media', 'VR/AR Headset Compatibility', 'Shareable Public & Private Links'], viewer: { type: 'custom' as const } },
  { id: 'content-creation', title: 'Content Creation', dark: false, reverse: false, features: ['AI-Powered Video Summaries', 'Automated Timeline Generation', 'Drone & Site Photo Management', 'Branded Content Exports'], viewer: { type: 'video' as const, src: '/demo-video.mp4' } },
  { id: 'geospatial', title: 'Geospatial & Robotics', dark: true, reverse: true, features: ['Live Cesium 3D Globe', 'Drone & Robot Data Integration', 'LiDAR Point Cloud Visualization', 'GNSS & Mission Planning'], viewer: { type: 'custom' as const } },
  { id: 'reports', title: 'Reports & Analytics', dark: false, reverse: false, features: ['Customizable KPI Dashboards', 'Automated PDF/CSV Exports', 'Predictive Cost & Schedule Analysis', 'Stakeholder-Ready Visualizations'], viewer: { type: 'image' as const, src: '/charts/analytics.png' } },
  { id: 'vr-ar-lab', title: 'VR/AR Lab', dark: true, reverse: true, features: ['Immersive Design Review', 'On-Site AR Model Overlay', 'Virtual Safety Training Scenarios', 'Multi-User VR Collaboration'], viewer: { type: 'iframe' as const, src: 'https://your-vr-experience.com' } },
];

export default function Page() {
  const [activeSection, setActiveSection] = useState<string | null>('hero');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <Header activeSection={activeSection} />
      <main className="snap-container">
        <section
          id="hero"
          className="tile-section p-20 md:p-24 tile-surface-light"
          ref={(el) => { if (el) sectionRefs.current['hero'] = el; }}
        >
          <div className="text-center flex flex-col items-center">
            <SectionHeader title="Slate360" subtitle="From Design to Reality" align="center" />
            <p className="max-w-3xl mb-8 text-lg md:text-xl">The all-in-one platform for AEC professionals.</p>
            <MediaWrapper type="iframe" src="https://your-main-3d-viewer.com" alt="Slate360 3D Viewer" />
          </div>
        </section>

        {tileData.map((tile, index) => (
          <Tile
            key={tile.id}
            id={tile.id}
            dark={tile.dark}
            reverse={tile.reverse}
            ref={(el) => { if (el) sectionRefs.current[tile.id] = el; }}
            className={clsx(index === tileData.length - 1 && 'md:min-h-[calc(100vh-80px)]')}
            textContent={(
              <>
                <SectionHeader title={tile.title} />
                <ul className="mt-4 space-y-2 text-left text-sm md:text-base">
                  {tile.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <span className="text-brand-blue mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </>
            )}
            mediaContent={(
              <MediaWrapper type={tile.viewer.type} src={tile.viewer.src} alt={tile.title + ' media'} />
            )}
          />
        ))}
      </main>
      <Footer />
    </>
  );
}
