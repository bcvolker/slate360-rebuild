
'use client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Section from '@/components/ui/Section';
import Tile from '@/components/Tile';

export default function HomePage() {
  // Placeholder media; replace with CEO-uploaded sources later.
  const tiles = [
    {
      id: 'overview',
      title: 'Slate360',
      description:
        'A unified platform for BIM, 360 tours, geospatial, and analytics. Explore interactive demos and learn how Slate360 elevates built-environment workflows.',
      media: { type: 'image' as const, src: '/slate360logoforwebsite.png', alt: 'Hero demo' },
      learnMoreHref: '/overview',
      biggerHero: true,
      features: [
        { text: 'Interactive 3D models (mouse/touch navigation)' },
        { text: 'Uniform media viewers across tiles' },
        { text: 'Scroll-snap sections & sticky navigation' },
        { text: 'Mobile-first with expandable viewers' },
      ],
    },
    {
      id: 'project-hub',
      title: 'Project Hub',
      description:
        'Centralize RFIs, submittals, docs, and tasks with real-time collaboration. Tailored dashboards for single or multi-project organizations.',
      media: { type: 'video' as const, src: '/videos/project-hub.mp4', poster: '/videos/poster-project-hub.jpg' },
      learnMoreHref: '/features/project-hub',
      features: [
        { text: 'RFI & Submittal Tracking' },
        { text: 'Document Control & Daily Logs' },
        { text: 'Task Boards & Timeline Views' },
        { text: 'Flexible portfolio/single-project modes' },
      ],
    },
    {
      id: 'bim-studio',
      title: 'BIM Studio',
      description:
        'View and analyze IFC/GLTF with annotations, clash checks, and export tools. Future: CEO uploads of models for live demos.',
      media: { type: 'model' as const, src: '/models/sample.gltf' },
      learnMoreHref: '/features/bim-studio',
      features: [
        { text: 'Parametric-ready components' },
        { text: 'Clash detection (roadmap hook)' },
        { text: 'Keyframe flythrough (roadmap)' },
        { text: 'Semi-transparent HUD controls' },
      ],
      reverse: true,
    },
    {
      id: 'tours',
      title: '360 Tour Builder',
      description:
        'Create immersive site walkthroughs with hotspots, audio, and VR compatibility. CEO can upload panoramas to power demos.',
      media: { type: 'tour' as const, src: '/tours/demo.json' },
      learnMoreHref: '/features/360-tours',
      features: [
        { text: 'Hotspots & Measurements' },
        { text: 'VR Mode (WebXR-ready)' },
        { text: 'Floorplans & timeline comparison' },
        { text: 'Branding & overlays' },
      ],
    },
    {
      id: 'content',
      title: 'Content Creation',
      description:
        'Batch photo/video editing with AI assists, LUTs, branding, and social presets.',
      media: { type: 'video' as const, src: '/videos/content.mp4', poster: '/videos/poster-content.jpg' },
      learnMoreHref: '/features/content',
      features: [
        { text: 'Magnetic Timeline' },
        { text: 'AI Enhancement Presets' },
        { text: 'Export templates' },
        { text: 'Team review hooks' },
      ],
      reverse: true,
    },
    {
      id: 'geospatial',
      title: 'Geospatial & Robotics',
      description:
        'Plan missions, analyze flatness/volume, overlay maps, and track progress.',
      media: { type: 'image' as const, src: '/images/geospatial.jpg', alt: 'Geospatial' },
      learnMoreHref: '/features/geospatial',
      features: [
        { text: 'Automated mission planning' },
        { text: 'Volumetrics & overlays' },
        { text: 'RTK/PPK hooks' },
        { text: 'DXF/point cloud export' },
      ],
    },
    {
      id: 'insights',
      title: 'Reports & Insights',
      description:
        'Thermal analysis, KPIs, and PDF/Excel exports with AI-assisted insights.',
      media: { type: 'image' as const, src: '/images/insights.jpg', alt: 'Insights' },
      learnMoreHref: '/features/insights',
      features: [
        { text: 'Custom KPI builder' },
        { text: 'Thermal palettes & anomalies' },
        { text: 'Report templates' },
        { text: 'One-click PDF export (hooks)' },
      ],
      reverse: true,
    },
    {
      id: 'vr',
      title: 'VR / AR',
      description:
        'Step into your projects, simulate scenarios, and record flythroughs.',
      media: { type: 'image' as const, src: '/images/vr.jpg', alt: 'VR' },
      learnMoreHref: '/features/vr',
      features: [
        { text: 'Multi-user sessions (roadmap)' },
        { text: 'Marker-based AR (roadmap)' },
        { text: 'Recording & sharing' },
        { text: 'Headset-friendly UI' },
      ],
    },
  ];

  return (
    <main className="bg-gradient-to-b from-white to-slate-50">
      <Header />

      {/* Scroll container */}
      <div className="snap-y snap-mandatory">
        {tiles.map((t, i) => (
          <Section key={t.id} id={t.id}>
            <Tile {...t} reverse={t.reverse ?? (i % 2 === 1)} />
          </Section>
        ))}
      </div>

      <Footer />
    </main>
  );
}

