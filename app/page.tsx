const tiles = [
  { id: 'slate360', title: 'Slate360', desc: 'Unifies BIM, 360 tours, analytics, VR.', features: ['Secure hub', 'Cross-team', 'Risk forecast', 'Tool sync'], cta: '#' },
  { id: 'bim', title: 'BIM Studio', desc: 'Browser-based BIM. No installs.', features: ['Any device', 'Track revisions', 'Find conflicts', '3D annotate'], cta: '#' },
  { id: '360', title: '360 Tour Builder', desc: 'Interactive 360 walkthroughs.', features: ['No code', 'Headset ready'], cta: '#' },
  { id: 'content', title: 'Content Studio', desc: 'Polished visuals in-app.', features: ['Edit drone', 'Share branded'], cta: '#' },
  { id: 'geospatial', title: 'Geospatial & Robotics', desc: 'Drone + GNSS + robotics.', features: ['LiDAR sync', 'Robot control'], cta: '#' },
  { id: 'analytics', title: 'Analytics & Reports', desc: 'Predictive insights.', features: ['Stakeholder view', 'Risk alerts'], cta: '#' },
  { id: 'vr', title: 'AR/VR Studio', desc: 'Step inside your model.', features: ['VR walk', 'Remote collab'], cta: '#' },
];

const gradients = [
  'from-slate-50 to-blue-50',
  'from-orange-50 to-amber-50',
  'from-cyan-50 to-teal-50',
  'from-orange-50 to-amber-50',
  'from-orange-50 to-amber-50',
  'from-orange-50 to-amber-50',
  'from-cyan-50 to-teal-50',
];

export default function Home() {
  return (
    <main className="snap-container">
      {tiles.map((t, i) => (
        <section key={t.id} id={t.id} className={`snap-child min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br ${gradients[i % 7]}`}>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-5xl font-bold">{t.title}</h2>
              <p className="text-lg">{t.desc}</p>
              <ul className="space-y-2">
                {t.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2">
                    <span className="text-orange-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href={t.cta} className="text-blue-600 font-medium">Learn more →</a>
            </div>
            <div className="bg-slate-900 rounded-3xl p-8 text-white text-center">
              <div className="text-6xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold">{t.title} Viewer</h3>
              <p className="text-sm mt-2">Interactive tools coming soon</p>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}