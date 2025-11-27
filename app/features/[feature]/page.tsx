import { notFound } from 'next/navigation';
import Footer from "@/components/ui/Footer";
import PageShell from "@/components/ui/PageShell";
import GlassCard from "@/components/ui/GlassCard";

const features = {
  "project-hub": { title:"Project Hub", desc:"Centralized project management tools." },
  "bim-studio": { title:"BIM Studio", desc:"Advanced BIM modeling and clash detection." },
  "tour-builder": { title:"360 Tour Builder", desc:"Create and host immersive 360° tours." },
  "content-creation": { title:"Content Creation Studio", desc:"AI-powered editing tools." },
  "geospatial": { title:"Geospatial & Robotics", desc:"Drone and robotics mapping integration." },
  "reports": { title:"Reports & Analytics", desc:"Thermal, predictive, and KPI reporting." },
  "vr-studio": { title:"Virtual Reality Studio", desc:"Immersive multi-user VR simulation." },
};

export default async function FeaturePage({params}:{params:Promise<{feature:string}>}){
  const { feature } = await params;
  const f = features[feature as keyof typeof features];
  if(!f) return notFound();
  return (
    <PageShell variant="dark" maxWidth="5xl" footer={<Footer />}>
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard variant="deep" className="px-6 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-white mb-6">{f.title}</h1>
          <p className="text-lg md:text-xl text-[color:var(--slate-surface-light)] max-w-2xl mx-auto">{f.desc}</p>
        </GlassCard>
      </div>
    </PageShell>
  );
}