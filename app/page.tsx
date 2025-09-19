// Final, clean homepage implementation
import React, { useState, useEffect, useRef } from 'react';

export const revalidate = 0;
export const dynamic = "force-dynamic";
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

export const revalidate = 0;
export const dynamic = "force-dynamic";
import PageClient from "./page-client";

export default function PageWrapper() {
  return <PageClient />;
}
        entries.forEach((entry) => {
