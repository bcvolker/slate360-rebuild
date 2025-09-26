import Link from "next/link";
import Image from "next/image";
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
      className="w-full min-h-screen md:h-screen md:snap-start md:snap-always bg-white scroll-mt-12 relative"
    >
      {/* Mobile Layout */}
      <div className="md:hidden w-full min-h-screen flex flex-col justify-center px-6 py-8">
        {/* Content Section for Mobile */}
        <div className="flex-1 flex flex-col justify-center space-y-4 mb-6">
          {id === 'hero' ? (
            <div className="flex justify-start mb-2">
              <Image
                src="/logowithoutchevron.png"
                alt="Slate360 Logo"
                width={150}
                height={45}
                priority
                className="h-[1.2rem] w-auto object-contain"
              />
            </div>
          ) : (
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          )}
          {subtitle && (
            <h3 className="text-lg font-semibold text-[#4B9CD3]">{subtitle}</h3>
          )}
          <p className="text-base text-gray-700 leading-relaxed">{description}</p>
          
          {features && features.length > 0 && (
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="text-[#B87333] text-base mt-1">▸</span>
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          )}
          
          <Link
            href={learnHref}
            className="inline-flex items-center gap-2 bg-[#B87333] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#9f5f24] transition-colors shadow-lg w-fit text-sm"
          >
            Learn More →
          </Link>
        </div>
        
        {/* Mobile Thumbnail Viewer at Bottom */}
        <div className={`w-full flex ${isReverse ? "justify-start" : "justify-end"}`}>
          <div className="w-24 h-16 rounded-lg shadow-md overflow-hidden border border-slate-200 cursor-pointer hover:shadow-lg transition-shadow">
            <MediaViewer id={id} title={title} thumbnail={true} />
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full h-full items-center justify-center">
        <div className="w-full max-w-7xl mx-auto px-8">
          <div className={`flex ${
            isReverse ? "md:flex-row-reverse" : "md:flex-row"
          } items-center justify-center gap-8 h-full`}>
            
            {/* Viewer Section - Desktop */}
            <div className={`${viewerWidth} flex flex-col items-center shrink-0`}>
              <div className={`w-full ${viewerHeight} rounded-lg shadow-lg overflow-hidden border border-slate-200`}>
                <MediaViewer id={id} title={title} />
              </div>
            </div>

            {/* Content Section - Desktop */}
            <div className="flex-1 max-w-2xl space-y-6 flex flex-col justify-center">
              {id === 'hero' ? (
                <div className="flex justify-start">
                  <Image
                    src="/logowithoutchevron.png"
                    alt="Slate360 Logo"
                    width={200}
                    height={60}
                    priority
                    className="h-[1.5rem] md:h-[2rem] w-auto object-contain"
                  />
                </div>
              ) : (
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{title}</h2>
              )}
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
      
      {/* Footer integrated into last tile */}
      {id === 'vr' && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#B87333]/20">
          <div className="mx-auto w-full max-w-7xl px-8 py-6 text-xs text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col space-y-1">
                <p className="font-semibold text-gray-900">© {new Date().getFullYear()} Slate360</p>
                <p className="text-slate-500">From Design to Reality</p>
              </div>
              <nav className="flex flex-wrap items-center gap-4 text-xs">
                <a href="/about" className="hover:text-[#B87333] transition-colors">About</a>
                <a href="/contact" className="hover:text-[#B87333] transition-colors">Contact</a>
                <a href="/pricing" className="hover:text-[#B87333] transition-colors">Pricing</a>
                <a href="/privacy" className="hover:text-[#B87333] transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-[#B87333] transition-colors">Terms</a>
                <a href="/cookies" className="hover:text-[#B87333] transition-colors">Cookies</a>
              </nav>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
