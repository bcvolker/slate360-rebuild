import React from "react";
import Link from "next/link";
import Image from "next/image";
import MediaViewer from "./MediaViewer";
import MobileViewerLauncher from "./MobileViewerLauncher";
import * as LucideIconsRaw from "lucide-react";
const LucideIcons = LucideIconsRaw;

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  features?: string[];
  icon?: string;
  cta?: string;
  route?: string;
  learnHref?: string;
  viewerOn?: "left" | "right";
  hero?: boolean;
  isAlt?: boolean;                // NEW
  isHero?: boolean;               // NEW
  hasDivider?: boolean;           // NEW: allow turning off on last tile
};

export default function TileSection({
  id,
  title,
  subtitle,
  description,
  features = [],
  icon,
  cta = "Learn More",
  route = "#",
  learnHref,
  viewerOn = "right",
  hero = false,
  isAlt = false,
  isHero = false,
  hasDivider = true,
}: Props) {
  const isReverse = viewerOn === "left";
  
  // Standardized sizing: consistent viewer sizing across tiles
  const viewerWidth = "md:w-[42%]";
  const viewerHeight = "h-[50vh] md:h-[55vh] lg:h-[60vh]";
  
  const bgClass = isAlt ? "bg-tile-alt" : "bg-tile-base";
  const dividerClass = hasDivider ? "section-divider" : "";
  
  return (
    <section
      id={id}
      className={`tile-section bg-animated-gradient relative w-full min-h-[calc(100dvh-5rem)] md:min-h-[calc(100vh-5rem)] md:h-[calc(100vh-5rem)] snap-start grid grid-rows-[1fr_auto_1fr] items-stretch scroll-mt-20 md:scroll-mt-0 ${bgClass} ${dividerClass} ${id === 'vr' ? 'last:scroll-mb-20' : ''}`}
      data-tile={id}
    >
      {/* DEBUG banner */}
      <div className="w-full bg-yellow-200 text-yellow-900 text-xs font-bold py-1 px-2 border-b border-yellow-400">DEBUG TILE: {id}</div>

      {/* Top spacer - eliminated for hero tile on mobile to counteract pt-20 */}
      <div className={`${isHero ? 'h-0 md:h-16' : 'h-12 md:h-16'}`} aria-hidden="true" />

      {/* Middle row: content wrapper */}
      <div className="row-start-2 place-self-stretch w-full relative">
        {/* Optional hero overlay behind content - only covers content area */}
        {isHero && <div className="absolute inset-0 bg-hero-animated pointer-events-none" />}
        {/* Mobile Layout */}
        <div
          className={`md:hidden w-full flex flex-col px-6 ${isHero ? 'pt-8 pb-4 -mt-4' : 'py-8'} border-b border-slate-200/70 last:border-b-0 relative z-10`}
          style={{ paddingBottom: id === 'vr' ? undefined : 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Content Section for Mobile */}
          <div className="grid grid-cols-2 gap-4">
            {/* Icon */}
            <div className="flex items-center justify-center">
              {icon &&
                // @ts-expect-error dynamic Lucide icon access by string name
                typeof LucideIcons[icon] === "function"
                ? // @ts-expect-error dynamic Lucide icon access by string name
                  React.createElement(LucideIcons[icon], { size: 32, color: "#B87333" })
                : null}
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg font-bold leading-tight text-brand-ink">{title}</h2>
              <h3 className="text-sm font-semibold text-brand-blue leading-snug">{subtitle}</h3>
              <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
              <Link href={route} className="mt-2 text-brand-copper underline">{cta}</Link>
            </div>
          </div>
        </div>
        {/* Desktop Layout */}
        <div className="hidden md:flex w-full h-full items-stretch justify-center relative z-10">
          <div className={`w-full max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-10 ${id === 'vr' ? 'md:pt-12' : ''} h-full`}>
            <div className={`flex ${isReverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center justify-between gap-8 min-w-0`}>
              {/* Viewer Section - Desktop */}
              <div className={`${viewerWidth} flex flex-col items-center justify-center shrink-0 h-full`}>
                <div className={`w-full ${viewerHeight} max-h-[60vh] rounded-lg shadow-lg overflow-hidden border-4 border-[#B87333]`}>
                  <MediaViewer id={id} title={title} />
                </div>
              </div>

              {/* Content Section - Desktop */}
              <div className="text-side flex-1 min-w-0 max-w-2xl space-y-6 flex flex-col justify-center h-full transition-all duration-300">
                {isHero ? (
                  <div className="flex items-center justify-start -mb-3">
                    <Image 
                      src="/logowithoutchevron.png" 
                      alt="Slate360" 
                      width={160} 
                      height={48} 
                      className="h-8 md:h-10 w-auto"
                    />
                  </div>
                ) : (
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--brand-ink)' }}>{title}</h2>
                )}
                {subtitle && (
                  <h3 className="text-xl md:text-2xl font-semibold text-[#4B9CD3] leading-snug">{subtitle}</h3>
                )}
                <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-prose">{description}</p>

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
                  href={route}
                  className="inline-flex items-center gap-2 bg-[#B87333] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#9f5f24] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 shadow-lg w-fit text-base"
                >
                  {cta}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex w-full h-full items-stretch justify-center relative z-10">
          <div className={`w-full max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-10 ${id === 'vr' ? 'md:pt-12' : ''} h-full`}>
            <div className={`flex ${isReverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center justify-between gap-8 min-w-0`}>
              {/* Viewer Section - Desktop */}
              <div className={`${viewerWidth} flex flex-col items-center justify-center shrink-0 h-full`}>
                <div className={`w-full ${viewerHeight} max-h-[60vh] rounded-lg shadow-lg overflow-hidden border border-slate-200`}>
                  <MediaViewer id={id} title={title} />
                </div>
              </div>

              {/* Content Section - Desktop */}
              <div className="text-side flex-1 min-w-0 max-w-2xl space-y-6 flex flex-col justify-center h-full transition-all duration-300">
                {isHero ? (
                  <div className="flex items-center justify-start -mb-3">
                    <Image 
                      src="/logowithoutchevron.png" 
                      alt="Slate360" 
                      width={160} 
                      height={48} 
                      className="h-8 md:h-10 w-auto"
                    />
                  </div>
                ) : (
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--brand-ink)' }}>{title}</h2>
                )}
                {subtitle && (
                  <h3 className="text-xl md:text-2xl font-semibold text-[#4B9CD3] leading-snug">{subtitle}</h3>
                )}
                <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-prose">{description}</p>

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
                  href={route}
                  className="inline-flex items-center gap-2 bg-[#B87333] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#9f5f24] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 shadow-lg w-fit text-base"
                >
                  {cta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom spacer - reduced to minimize white banner */}
      <div className="h-4 md:h-6" aria-hidden="true" />

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
