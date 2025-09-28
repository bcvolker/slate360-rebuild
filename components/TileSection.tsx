import Link from "next/link";
import Image from "next/image";
import MediaViewer from "./MediaViewer";
import MobileViewerLauncher from "./MobileViewerLauncher";

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
  
  // Standardized sizing: slightly larger viewer for better balance
  const viewerWidth = hero ? "md:w-[45%]" : "md:w-[40%]";
  const viewerHeight = hero ? "h-[60%]" : "h-[55%]";
  
  return (
    <section 
      id={id} 
       className={`relative w-full min-h-[calc(100svh-5rem)] md:min-h-[calc(100vh-5rem)] md:h-[calc(100vh-5rem)] snap-start border-b border-slate-200/70 flex md:items-center md:justify-center md:py-8 md:scroll-mt-0 ${id === 'vr' ? 'last:scroll-mb-20' : ''}`}
    >
      {/* Mobile Layout */}
      <div 
        className={`md:hidden w-full flex flex-col px-6 ${id === 'vr' ? 'pt-16 pb-24' : id === 'hero' ? 'pt-24 pb-6' : 'py-16 pb-6'} border-b border-slate-200/70 last:border-b-0`}
        style={{ paddingBottom: id === 'vr' ? undefined : 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Content Section for Mobile */}
        <div className="flex flex-col justify-start space-y-4 mb-6">
          {id === 'hero' ? (
            <Image
              src="/logowithoutchevron.png"
              alt="Slate360"
              width={300}
              height={84}
              priority
              className="h-[2.6rem] w-auto object-contain self-start -ml-1 mt-1"
            />
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
        
        {/* Mobile Thumbnail Viewer at Bottom (2x size and clickable to expand) */}
        <div className={`w-full flex ${isReverse ? "justify-start" : "justify-end"}`}>
          <div className="md:hidden mb-4">
            <MobileViewerLauncher id={id} title={title} />
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
     <div className="hidden md:flex w-full h-full items-stretch justify-center">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-24 md:pt-16 pt-8 h-full">
          <div className={`flex ${
            isReverse ? "md:flex-row-reverse" : "md:flex-row"
          } items-center justify-between gap-6 min-w-0`}>
            
            {/* Viewer Section - Desktop */}
            <div className={`${viewerWidth} flex flex-col items-center justify-center shrink-0 h-full`}>
              <div className={`w-full ${viewerHeight} rounded-lg shadow-lg overflow-hidden border border-slate-200`}> 
                <MediaViewer id={id} title={title} />
              </div>
            </div>

            {/* Content Section - Desktop */}
            <div className="flex-1 min-w-0 max-w-2xl space-y-6 flex flex-col justify-center h-full">
              {id === 'hero' ? (
                <Image
                  src="/logowithoutchevron.png"
                  alt="Slate360"
                  width={420}
                  height={120}
                  priority
                  className="h-[3.2rem] md:h-[4rem] w-auto object-contain self-start -ml-2"
                />
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
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 border-t border-[#B87333]/20">
          <div className="mx-auto w-full max-w-7xl px-6 py-3 text-[11px] text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="font-semibold text-gray-900">© {new Date().getFullYear()} Slate360</span>
                <span className="text-slate-500">• From Design to Reality</span>
              </div>
              <nav className="flex flex-wrap items-center gap-3">
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
