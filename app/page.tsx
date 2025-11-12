import TileSection from '../components/TileSection';

const tiles = [
  { id: 'slate360', title: 'Slate360', description: 'Unifies BIM, 360 tours, analytics, VR.', features: ['Secure hub', 'Cross-team', 'Risk forecast', 'Tool sync'], cta: '#' },
  { id: 'project-hub', title: 'Project Hub', description: 'Daily logs, RFIs, submittals, observations, timecards, markups.', features: ['Daily logs', 'RFIs/submittals', 'Observations', 'Timecards/markups'], cta: '#' },
  { id: 'bim', title: 'BIM Studio', description: 'Browser-based BIM. No installs.', features: ['Any device', 'Track revisions', 'Find conflicts', '3D annotate'], cta: '#' },
  { id: '360', title: '360 Tour Builder', description: 'Interactive 360 walkthroughs.', features: ['No code', 'Headset ready'], cta: '#' },
  { id: 'content', title: 'Content Studio', description: 'Polished visuals in-app.', features: ['Edit drone', 'Share branded'], cta: '#' },
  { id: 'geospatial', title: 'Geospatial & Robotics', description: 'Drone + GNSS + robotics.', features: ['LiDAR sync', 'Robot control'], cta: '#' },
  { id: 'analytics', title: 'Analytics & Reports', description: 'Predictive insights.', features: ['Stakeholder view', 'Risk alerts'], cta: '#' },
  { id: 'vr', title: 'AR/VR Studio', description: 'Step inside your model.', features: ['VR walk', 'Remote collab'], cta: '#' },
];

export default function Home() {
  return (
    <>
      {tiles.map((tile, i) => (
        <TileSection key={tile.id} tile={tile} index={i} />
      ))}
    </>
  );
}