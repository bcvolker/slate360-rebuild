
"use client";
import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import Logo from '@/components/ui/Logo';
import Header from '@/components/ui/Header';
import Tile from '@/components/ui/Tile';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SectionHeader from '@/components/ui/SectionHeader';
import MediaWrapper from '@/components/ui/MediaWrapper';
import Footer from '@/components/ui/Footer';

const tileData = [
  { id: 'bim-studio', title: 'BIM Studio', dark: true, reverse: true, features: ['Cloud-Native 3D Viewer', 'Real-Time Collaboration', 'Version Control & Annotations', 'Automated Clash Detection'], viewer: { type: 'iframe', src: 'https://example-3d-viewer.com', alt: 'BIM Studio Viewer' } },
  { id: 'project-hub', title: 'Project Hub', dark: false, reverse: false, features: ['Centralized Document Management', 'RFI & Submittal Tracking', 'Daily Logs & Reporting', 'Team & Task Coordination'], viewer: { type: 'custom', alt: 'Project Hub Viewer' } },
  { id: 'tour-builder', title: '360 Tour Builder', dark: true, reverse: true, features: ['Intuitive Drag-and-Drop Interface', 'Embed Hotspots & Rich Media', 'VR/AR Headset Compatibility', 'Shareable Public & Private Links'], viewer: { type: 'video', src: '/tour-demo.mp4', alt: '360 Tour Demo' } },
  { id: 'content-creation', title: 'Content Creation', dark: false, reverse: false, features: ['AI-Powered Video Summaries', 'Automated Timeline Generation', 'Drone & Site Photo Management', 'Branded Content Exports'], viewer: { type: 'image', src: '/content-screenshot.png', alt: 'Content Screenshot' } },
  { id: 'geospatial', title: 'Geospatial & Robotics', dark: true, reverse: true, features: ['Live Cesium 3D Globe', 'Drone & Robot Data Integration', 'LiDAR Point Cloud Visualization', 'GNSS & Mission Planning'], viewer: { type: 'custom', alt: 'Geospatial Viewer' } },
  { id: 'reports', title: 'Reports & Analytics', dark: false, reverse: false, features: ['Customizable KPI Dashboards', 'Automated PDF/CSV Exports', 'Predictive Cost & Schedule Analysis', 'Stakeholder-Ready Visualizations'], viewer: { type: 'image', src: '/analytics-chart.png', alt: 'Analytics Chart' } },
  { id: 'vr-ar-lab', title: 'VR/AR Lab', dark: true, reverse: true, features: ['Immersive Design Review', 'On-Site AR Model Overlay', 'Virtual Safety Training Scenarios', 'Multi-User VR Collaboration'], viewer: { type: 'video', src: '/vr-demo.mp4', alt: 'VR/AR Demo' } },
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
      <Logo />
      <Header activeSection={activeSection} />
      <main className="snap-container">
        <section id="hero" className="tile-section tile-surface-light" ref={(el) => { sectionRefs.current['hero'] = el; }}>
          <div className="text-center flex flex-col items-center">
            <SectionHeader title="Slate360" subtitle="From Design to Reality" align="center" />
            <p className="max-w-3xl mb-8 text-lg md:text-xl">The all-in-one platform for AEC professionals. Integrate 3D models, geospatial data, and advanced reporting.</p>
            <Button>Request a Demo</Button>
            <MediaWrapper type="iframe" src="https://your-main-3d-viewer.com" alt="Slate360 Main Viewer" />
          </div>
        </section>

        {tileData.map((tile, index) => (
          <Tile
            key={tile.id}
            dark={tile.dark}
            reverse={tile.reverse}
            ref={(el) => { sectionRefs.current[tile.id] = el; }}
          >
            <div className={clsx(tile.reverse && 'md:order-last')}>
              <SectionHeader title={tile.title} />
              <Card className="mt-4 p-4">
                <ul className="space-y-2 text-left">
                  {tile.features.map(feature => <li key={feature} className="flex items-center"><span className="text-[var(--color-brand-blue)] mr-2">✓</span>{feature}</li>)}
                </ul>
              </Card>
              <Button className="mt-6">Explore {tile.title}</Button>
            </div>
            <div className="w-full flex items-center justify-center">
              <MediaWrapper
                type={tile.viewer.type as 'iframe' | 'video' | 'image' | 'custom'}
                src={tile.viewer.src}
                alt={tile.viewer.alt}
              />
            </div>
          </Tile>
        ))}
      </main>
      <Footer />
    </>
  );
}
/* Updated Fri Sep 19 00:24:46 UTC 2025 */
