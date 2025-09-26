import Link from "next/link";
import MediaViewer from "./MediaViewer";
import TileNavigation from "./ui/TileNavigation";

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  features: string[];
  learnHref: string;
  viewerOn?: "left" | "right";
  hero?: boolean;
};

export default function TileSection({
  id,
  title,
  subtitle,
  description,
  features,
  learnHref,
  viewerOn = "right",
  hero = false,
}: Props) {
  const isReverse = viewerOn === "left";
  
  // Standardized sizing: hero 30% smaller, others 25% smaller
  const viewerWidth = hero ? "md:w-[38.5%]" : "md:w-[33.75%]";
  const viewerHeight = "h-[52.5%]"; // Uniform height for all tiles
  
  return (
    <section 
      id={id} 
      className="w-full h-screen snap-start snap-always bg-white border-b border-[#B87333]/20 scroll-mt-12 relative overflow-hidden"
    >
      {/* Centered content with proper spacing */}
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto px-8">
          <div className={`flex ${
            isReverse ? "md:flex-row-reverse" : "md:flex-row"
          } items-center justify-center gap-8 h-full`}>
            
            {/* Viewer Section with Navigation Below - Centered */}
            <div className={`${viewerWidth} flex flex-col items-center shrink-0`}>
              {/* Viewer */}
              <div className={`w-full ${viewerHeight} rounded-lg shadow-lg overflow-hidden border border-slate-200`}>
                <MediaViewer id={id} title={title} />
              </div>
              
              {/* Constrained Navigation - 2x4 grid within viewer width */}
              <div className="mt-4 w-full">
                <TileNavigation />
              </div>
            </div>

            {/* Content Section - Centered */}
            <div className="flex-1 max-w-2xl space-y-6 flex flex-col justify-center">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{title}</h2>
              {subtitle && (
                <h3 className="text-lg md:text-xl font-semibold text-[#4B9CD3]">{subtitle}</h3>
              )}
              <p className="text-base md:text-lg text-gray-700 leading-relaxed">{description}</p>
              
              {features && features.length > 0 && (
                <ul className="space-y-2">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-[#B87333] text-base mt-1">▸</span>
                      <span className="text-base text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              <Link
                href={learnHref}
                className="inline-flex items-center gap-2 bg-[#B87333] text-white px-5 py-2 rounded-md font-semibold hover:bg-[#9f5f24] transition-colors shadow-lg w-fit text-sm"
              >
                Learn More →
              </Link>
            </div>
          </div>
        </div>
      </div>
      
    </section>
  );
}
