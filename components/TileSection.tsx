import Link from "next/link";
import MediaViewer from "./MediaViewer";

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
      className="w-full h-screen snap-start flex flex-col md:flex-row items-center justify-center bg-white border-b border-[#B87333]/20 scroll-mt-20"
    >
      {/* Uniform Layout Container */}
      <div className={`w-full h-full flex ${
        isReverse ? "md:flex-row-reverse" : "md:flex-row"
      } items-center justify-center`}>
        
        {/* Viewer Section - Standardized */}
        <div className={`${viewerWidth} ${viewerHeight} w-full flex items-center justify-center px-8 py-6`}>
          <div className="w-full h-full rounded-lg shadow-lg overflow-hidden border border-slate-200">
            <MediaViewer id={id} title={title} />
          </div>
        </div>

        {/* Content Section - Standardized */}
        <div className="flex-1 h-full flex flex-col justify-center px-8 py-6 max-w-2xl">
          <div className="space-y-6">
            <h2 className="text-5xl font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <h3 className="text-2xl font-semibold text-[#4B9CD3]">{subtitle}</h3>
            )}
            <p className="text-xl text-gray-700 leading-relaxed">{description}</p>
            
            {features && features.length > 0 && (
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="text-[#B87333] text-lg mt-1">▸</span>
                    <span className="text-lg text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            )}
            
            <Link
              href={learnHref}
              className="inline-flex items-center gap-2 bg-[#B87333] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#9f5f24] transition-colors shadow-lg"
            >
              Learn More →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
