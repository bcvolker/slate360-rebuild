import { notFound } from 'next/navigation';

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
    <div className="min-h-screen bg-white text-[var(--ink)] flex flex-col items-center justify-center p-12">
      <h1 className="text-4xl font-bold brand-blue">{f.title}</h1>
      <p className="mt-4 text-lg text-[var(--ink-sub)] max-w-2xl text-center">{f.desc}</p>
    </div>
  );
}