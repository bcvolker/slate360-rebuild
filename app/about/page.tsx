import Footer from "@/components/ui/Footer";
import PageShell from "@/components/ui/PageShell";

export default function AboutPage() {
  return (
    <PageShell variant="light" maxWidth="7xl" footer={<Footer />}>
      <div className="pb-20">
        {/* Page Header */}
        <div className="mb-12">
          <p className="text-blue-600 font-bold tracking-widest uppercase text-sm mb-2">Company</p>
          <h1 className="text-5xl font-black text-slate-900 font-orbitron uppercase">About Slate360</h1>
          <p className="text-xl text-slate-600 mt-4 max-w-2xl">
            We&apos;re building a single, visual home for how the built world gets delivered—where scans, docs, and decisions stay in sync.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Mission (Wide) */}
          <div className="lg:col-span-2 bg-white/80 backdrop-blur p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-orbitron">Our Mission</h3>
            <p className="text-slate-700 leading-relaxed">
              Slate360 empowers built environment professionals—from contractors and realtors to universities and drone pilots—to bridge administrative chaos and visual workflows. We turn raw data (LiDAR, 360 photos, project docs) into actionable insights.
            </p>
          </div>

          {/* Card 2: Who We Serve (Tall) */}
          <div className="lg:row-span-2 bg-white/80 backdrop-blur p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-orbitron">Who We Serve</h3>
            <p className="text-slate-700 leading-relaxed mb-4">
              General contractors managing multi-site chaos, government teams tracking capital projects, and design teams visualizing models.
            </p>
            <p className="text-slate-700 leading-relaxed">
              Whether you&apos;re a freelancer or an enterprise with 50+ users, Slate360 scales with individualized profiles and RBAC for teams.
            </p>
          </div>

          {/* Card 3: Why We Built It */}
          <div className="bg-white/80 backdrop-blur p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-4 font-orbitron">Why We Built It</h3>
            <p className="text-slate-700 leading-relaxed">
              We&apos;ve seen siloed apps slow decisions. Slate360 is the unified hub where admin docs flow to geospatial plans instantly.
            </p>
          </div>

          {/* Card 4: Roadmap */}
          <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-lg border border-slate-800">
            <h3 className="text-2xl font-bold text-white mb-4 font-orbitron">Roadmap</h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>• Early Access: Core Hubs Live</li>
              <li>• Q4 2025: Beta Launch + Tiers</li>
              <li>• Q1 2026: Full AI Automation</li>
            </ul>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
