import TileSection from '@/components/ui/TileSection'

const tiles = [
  {
    id: 'hero',
    title: 'Slate360: From Design to Reality',
    subtitle: 'Your vision, instantly realized—unify BIM, 360 tours, analytics, VR, and geospatial tools into one secure command center for the built environment.',
    bullets: [
      'Access every workflow in one hub—no more app-switching chaos.',
      'Connect office and field teams in real-time for seamless collaboration.',
      'Forecast risks, costs, and performance with built-in AI (toggle on/off).',
      'Plug into tools you already use: Upload LiDAR, export to Procore or DroneDeploy.'
    ],
    cta: 'Request a Free Demo',
    viewer: 'Interactive 3D digital twin morphing from blueprint to built site.',
    link: '/demo'
  },
  {
    id: 'project-hub',
    title: 'Project Hub',
    subtitle: 'Manage and document projects like a pro—track schedules, budgets, and RFIs without Procore\'s $500/mo price tag.',
    bullets: [
      'Create projects with pins on Google Maps—share markup PDFs for subs (e.g., parking zones).',
      'Custom folders + AI doc review: Split PDFs, generate POs/bids from contracts.',
      'Punch lists, Gantt charts, and team collab—RBAC for freelancers to enterprises.',
      'Offline sync: Add notes/photos from the field, auto-file on reconnect.'
    ],
    cta: 'Start Free Trial',
    viewer: 'Embedded video: Timelapse of a construction site from kickoff to handover.',
    link: '/features/project-hub'
  },
  {
    id: 'bim-studio',
    title: 'BIM Studio',
    subtitle: 'SketchUp-level design without the sub—build 2D plans, convert to 3D models, and prep for printing or VR.',
    bullets: [
      'Prepacked libraries + AI 2D-to-3D (free Open3D or premium RealityCapture—cost calculator included).',
      'Clash detection, volume calcs, and animations—export GLB/IFC for Revit compatibility.',
      '3D Print Studio integration: Slice models, segment for multi-printer farms, add pegs/magnets for assembly.',
      'Progress tracking: Animate fly-throughs of sites, stadiums, or custom builds.'
    ],
    cta: 'Explore BIM Tools',
    viewer: 'Interactive 3D model: Orbit a building from wireframe blueprint to textured reality.',
    link: '/features/bim-studio'
  },
  {
    id: 'content-studio',
    title: 'Content Studio',
    subtitle: 'Edit drone footage, photos, and timelapses like Final Cut—turn raw clips into social-ready reels in minutes.',
    bullets: [
      'AI enhancements: Stabilize, speed-ramp, color-grade; add LUTs, text, music libraries.',
      'Batch timelapse creator: Auto-stitch site progress, export at 4K for LinkedIn.',
      'Aspect ratios for platforms (Instagram/TikTok presets)—no watermarks, full ownership.',
      'Hotspot editor: Overlay notes/logos on videos for client deliverables.'
    ],
    cta: 'Upload Your First Clip',
    viewer: 'Embedded video: Before/after edit of a construction timelapse with effects.',
    link: '/features/content-studio'
  },
  {
    id: '360-tour-builder',
    title: '360 Tour Builder',
    subtitle: 'Stitch and host immersive tours that beat Kuula—brand, add hotspots, and embed on Zillow or your site.',
    bullets: [
      'Auto/manual stitching from 360 cams or drone panoramas—export to Google Maps.',
      'Hotspots with photos/videos/notes: Guide clients through progress or staging.',
      'Shareable links/codes: View-only for non-users, analytics on tour engagement.',
      'VR-ready: Convert to WebXR for headset tours of properties or job sites.'
    ],
    cta: 'Build Your First Tour',
    viewer: 'Interactive 360 viewer: Clickable tour of a construction site with hotspots.',
    link: '/features/360-tour-builder'
  },
  {
    id: 'geospatial-robotics',
    title: 'Geospatial & Robotics',
    subtitle: 'Plan drone/robot missions and analyze volumes—replace DroneDeploy/Pix4D for under $150/mo.',
    bullets: [
      'Waypoint editor with AR overlays: Repeatable autonomous paths using BIM models.',
      'LiDAR/photogrammetry processing: OpenDroneMap for point clouds, volume calcs, layer toggles.',
      'Survey-grade exports: KML/GeoJSON for GIS; mobile app for on-site uploads.',
      'Anomaly detection (AI toggle): Spot cracks/leaks in scans, predict risks.'
    ],
    cta: 'Plan a Mission',
    viewer: 'Interactive 3D map: Drone flight path over a site with volume highlights.',
    link: '/features/geospatial'
  },
  {
    id: 'virtual-reality-studio',
    title: 'Virtual Reality Studio',
    subtitle: 'Convert scans to explorable VR worlds—stage spaces, inspect remotely, or simulate plays (Athlete 360 add-on).',
    bullets: [
      'Import BIM/LiDAR → WebXR rooms: Orbit in 360, add annotations/hotspots.',
      'Staging tools: Virtual furniture for realtors; motion analysis for coaches (MediaPipe scrubs).',
      'Export/share: GLB for Oculus or embeddable viewers—no extra apps needed.',
      'Team collab: Real-time edits, Zoom integration for virtual walkthroughs.'
    ],
    cta: 'Launch VR Preview',
    viewer: 'Embedded video: VR walkthrough of a staged home from site scan.',
    link: '/features/vr-studio'
  },
  {
    id: 'analytics-reports',
    title: 'Analytics & Reports',
    subtitle: 'Pull data from all tabs into custom templates—auto-generate insights that wow stakeholders.',
    bullets: [
      'AI reports: Energy forecasts, cost variances, anomaly heatmaps (YOLOv5 toggle).',
      'Templates: Punch lists, site surveys—drag-drop sections, export PDF/CSV.',
      'Cross-tab magic: BIM volumes → budget alerts; Geospatial scans → progress dashboards.',
      'CEO tools: Revenue metrics, user analytics—90% margins baked in.'
    ],
    cta: 'Generate Your Report',
    viewer: 'Interactive dashboard: Animated chart of project cost trends.',
    link: '/features/analytics'
  }
]

export default function Home() {
  return (
    <>
      <TileSection tiles={tiles} />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            console.log('Scroll container height: ', document.getElementById('scroll-container')?.offsetHeight);
            console.log('Viewer test width: ', document.querySelector('.viewer-card')?.offsetWidth || 'No viewer found');
          `
        }}
      />
    </>
  )
}