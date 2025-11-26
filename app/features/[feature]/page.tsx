import { notFound } from 'next/navigation';
import Footer from "@/components/ui/Footer";

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
    <>
      <main className="min-h-[100dvh] px-6 py-24 md:py-28 bg-slate-50 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] flex items-center justify-center">
        <div className="mx-auto max-w-4xl w-full">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-md shadow-sm px-6 py-16 text-center">
            <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-[#4F89D4] mb-6">{f.title}</h1>
            <p className="text-lg md:text-xl text-slate-700 max-w-2xl mx-auto">{f.desc}</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}