import Link from 'next/link';

interface Props {
  title: string;
  copy: string;
  ctaLabel?: string;
  ctaHref?: string;
  features?: string[];
}

export default function MobileTileContent({ title, copy, ctaLabel = "Learn More", ctaHref = "#", features = [] }: Props) {
  return (
    <div className="flex flex-col justify-center h-screen px-6 py-20 bg-slate360-charcoal snap-start">
      {/* 1. Header Padding to prevent overlap */}
      <div className="h-16 w-full" /> 
      
      {/* 2. Text Content */}
      <div className="flex-1 flex flex-col justify-center space-y-4 rounded-2xl border border-slate360-blue/30 bg-slate360-panel/90 p-8 shadow-blueGlow backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate360-blue">Slate360</p>
        <h2 className="font-orbitron text-3xl text-slate-50">{title}</h2>
        <p className="text-sm text-slate-300 leading-relaxed line-clamp-6">{copy}</p>
        
        {/* Features */}
        <ul className="space-y-2">
           {features.slice(0,3).map((f,i) => (
             <li key={i} className="text-xs text-slate-400 flex gap-2">
               <span className="text-slate360-copper">•</span> {f}
             </li>
           ))}
        </ul>
      </div>

      {/* 3. The Fix: Small Thumbnail Button instead of Giant Viewer */}
      <div className="mt-6 w-full h-16 rounded-xl border border-slate360-blue/30 flex items-center justify-center bg-slate360-charcoalSoft cursor-pointer">
         <span className="text-xs uppercase font-bold text-slate360-blue">Tap to View 3D Model ↗</span>
      </div>
      
      {/* 4. CTA */}
      <div className="mt-4 mb-12">
         <Link href={ctaHref} className="block w-full py-4 text-center rounded-xl bg-slate360-blue text-white font-bold uppercase text-xs tracking-widest">
            {ctaLabel}
         </Link>
      </div>
    </div>
  );
}
