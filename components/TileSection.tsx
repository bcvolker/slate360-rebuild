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
      className="w-full h-screen snap-start snap-always flex flex-col items-center justify-start bg-white border-b border-[#B87333]/20 scroll-mt-20 relative"
    >
      {/* Main Content Container - Fixed positioning */}
      <div className="w-full max-w-7xl mx-auto h-full flex items-center justify-center pt-8 pb-20">
        <div className={`w-full h-full flex ${
          isReverse ? "md:flex-row-reverse" : "md:flex-row"
        } items-center justify-center gap-8`}>
          
          {/* Viewer Section - Fixed size and position */}
          <div className={`${viewerWidth} ${viewerHeight} flex items-center justify-center shrink-0`}>
            <div className="w-full h-full rounded-lg shadow-lg overflow-hidden border border-slate-200">
              <MediaViewer id={id} title={title} />
            </div>
          </div>

          {/* Content Section - Fixed position */}
          <div className="flex-1 max-w-2xl flex flex-col justify-center space-y-6 px-4">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">{title}</h2>
            {subtitle && (
              <h3 className="text-xl md:text-2xl font-semibold text-[#4B9CD3]">{subtitle}</h3>
            )}
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">{description}</p>
            
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
              className="inline-flex items-center gap-2 bg-[#B87333] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#9f5f24] transition-colors shadow-lg w-fit"
            >
              Learn More →
            </Link>
          </div>
        </div>
      </div>
      
      {/* Bottom Messaging Area */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center px-8">
        <div className="text-center text-gray-500">
          <p className="text-sm">
            Scroll to explore more features • Professional tools for modern workflows
          </p>
        </div>
      </div>
    </section>
  );
}
