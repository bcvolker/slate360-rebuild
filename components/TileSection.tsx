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
  
  // Standardized sizing: consistent viewer sizing across tiles
  const viewerWidth = "md:w-[42%]";
  const viewerHeight = "h-[50vh] md:h-[55vh] lg:h-[60vh]";
  
  return (
    <section
      id={id}
      className={`tile-section relative w-full min-h-[calc(100dvh-5rem)] md:min-h-[calc(100vh-5rem)] md:h-[calc(100vh-5rem)] snap-start border-b border-slate-200/70 grid grid-rows-[1fr_auto_1fr] items-stretch scroll-mt-20 md:scroll-mt-0 ${id === 'vr' ? 'last:scroll-mb-20' : ''}`}
    >
  {/* Top spacer */}
  <div className="h-12 md:h-16" aria-hidden="true" />

      {/* Middle row: content wrapper */}
      <div className="row-start-2 place-self-stretch w-full">
        {/* Mobile Layout */}
        <div
          className={`md:hidden w-full flex flex-col px-6 py-8 border-b border-slate-200/70 last:border-b-0`}
          style={{ paddingBottom: id === 'vr' ? undefined : 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Content Section for Mobile */}
          <div className="text-side flex flex-col justify-start space-y-4 mb-6 max-w-prose">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
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
          <div className={`w-full flex ${isReverse ? 'justify-start' : 'justify-end'}`}>
            <div className="md:hidden mb-4">
              <MobileViewerLauncher id={id} title={title} />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex w-full h-full items-stretch justify-center">
          <div className={`w-full max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-10 ${id === 'vr' ? 'md:pt-12' : ''} h-full`}>
            <div className={`flex ${isReverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center justify-between gap-8 min-w-0`}>
              {/* Viewer Section - Desktop */}
              <div className={`${viewerWidth} flex flex-col items-center justify-center shrink-0 h-full`}>
                <div className={`w-full ${viewerHeight} max-h-[60vh] rounded-lg shadow-lg overflow-hidden border border-slate-200`}>
                  <MediaViewer id={id} title={title} />
                </div>
              </div>

              {/* Content Section - Desktop */}
              <div className="text-side flex-1 min-w-0 max-w-2xl space-y-6 flex flex-col justify-center h-full">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{title}</h2>
                {subtitle && (
                  <h3 className="text-lg md:text-xl font-semibold text-[#4B9CD3]">{subtitle}</h3>
                )}
                <p className="text-base md:text-lg text-gray-700 leading-relaxed max-w-prose">{description}</p>

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
      </div>

  {/* Bottom spacer */}
  <div className="h-12 md:h-16" aria-hidden="true" />

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
