"use client";
import React, { useState } from "react";
import Link from 'next/link';

interface Tile {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  viewerTitle?: string;
  viewerSubtitle?: string;
}

interface TileSectionProps {
  tile: Tile;
  index: number;
  'data-placeholder'?: boolean;
}

export default function HomeSection({ tile, index }: TileSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isReversed = index % 2 === 1;
  const isFirstTile = index === 0;
  const isLastTile = index === 7; // Adjust based on total tiles
  const bullets: string[] = Array.isArray(tile?.bullets) ? tile?.bullets : [];

  // DESKTOP VIEWER CLASSES
  // Floated, specific size, hidden on mobile
  const desktopViewerClasses = `
    hidden md:flex relative z-20 transition-all duration-300 ease-in-out
    flex-col items-center justify-center
    bg-slate-900 border-2 border-dotted border-red-500
    tile-viewer-surface
    w-[460px] h-[336px] rounded-3xl p-8 mb-12 mt-0 cursor-default hover:bg-slate-900
    ${isFirstTile ? "lg:max-w-[550px] lg:h-[400px]" : ""}
    ${isReversed ? "lg:float-left lg:mr-12" : "lg:float-right lg:ml-12"}
  `;

  // MOBILE VIEWER CLASSES
  // Full width, fills container
  const mobileViewerClasses = `
    relative z-20 transition-all duration-300 ease-in-out
    flex flex-col items-center justify-center
    bg-slate-900 border border-white/10
    tile-viewer-surface
    w-full h-full cursor-pointer hover:bg-slate-800/50
    shrink-0
  `;

  // EXPANDED MOBILE VIEWER OVERLAY
  const expandedViewerClasses = `
    fixed bottom-0 left-0 right-0 h-[70vh] z-50 
    bg-slate-900 border-t border-theme-accent/50 rounded-t-2xl 
    shadow-[0_-10px_40px_rgba(0,0,0,0.8)]
    flex flex-col items-center justify-center
    transition-transform duration-300 ease-out
    ${isExpanded ? 'translate-y-0 visible' : 'translate-y-full invisible'}
  `;

  // Text Classes
  // Desktop: Wraps around float
  const textClasses = `
    tile-text-surface block
    lg:pb-12 lg:-ml-12
    ${isReversed ? "md:pr-20 xl:pr-0" : "md:pl-20 xl:pl-0"}
  `;

  return (
    <section
      id={tile?.id}
      data-snap="tile"
      className={`relative h-[100dvh] snap-start snap-always overflow-hidden flex flex-col ${isFirstTile ? "debug-section-center" : ""} pb-0 md:pb-20`}
      style={{ 
        // Only apply padding-top on desktop (md+). On mobile, we handle it inside the grid to avoid height issues.
        // We use a CSS variable for the value, but apply it conditionally.
        // Note: We can't easily use media queries in inline styles, so we'll use a class for the padding 
        // and remove this inline style for mobile via a utility class approach if possible, 
        // or just rely on the fact that we are refactoring the mobile layout to absorb the padding.
        // ACTUALLY: The safest way is to keep it here but override it for mobile in the className? 
        // No, inline styles win. Let's use a CSS variable that changes based on media query? No.
        // Let's just use Tailwind for the padding and remove the inline style.
      }}
    >
      {/* Main Content Container */}
      {/* Added pt-[80px] (navbar height) to desktop only via md:pt-[80px] */}
      {/* For mobile, we will apply the padding inside the grid's text row */}
      {/* Added pb-32 to ensure content doesn't spill off bottom on tablet/desktop */}
      <div className={`flex-1 flex items-start overflow-y-auto md:overflow-visible md:pt-[var(--navbar-height)] ${isFirstTile ? 'pt-0 md:pt-48 lg:pt-56' : 'pt-0 md:pt-48 lg:pt-56'} pb-0 md:pb-32`}>
        <div className="w-full max-w-6xl mx-auto px-6 md:px-16 lg:px-12 h-full flex flex-col md:block">
          
          {/* --- DESKTOP LAYOUT (md+) --- */}
          {/* Hidden on landscape phones (short height) even if width is md+ */}
          <div className="hidden md:flow-root md:max-h-[600px]:hidden relative w-full clearfix">
            
            {/* DESKTOP VIEWER */}
            <div className={desktopViewerClasses}>
              <span className="text-4xl text-theme-accent mb-2">▶</span>
              {tile?.viewerTitle && <h3 className="text-xl font-semibold text-white text-center">{tile.viewerTitle}</h3>}
              <p className="text-xs text-theme-muted text-center mt-1 leading-tight">
                Tap or click to expand and explore. Future versions will load 3D models, videos, or 360 tours here.
              </p>
            </div>

            {/* DESKTOP TEXT CONTENT */}
            <div className={textClasses}>
              {tile?.eyebrow && <p className="text-theme-accent font-bold tracking-widest uppercase text-xs mb-2">{tile.eyebrow}</p>}
              {tile?.title && <h2 className="text-4xl font-bold text-slate-900 font-orbitron tracking-wide mb-4">{tile.title}</h2>}
              {tile?.subtitle && <p className="text-lg text-theme-muted leading-relaxed mb-4">{tile.subtitle}</p>}
              {bullets.length > 0 && (
                <ul className="space-y-2 text-theme-muted mb-6">
                  {bullets.map((item, i) => (
                    <li key={i} className="flex items-start"><span className="text-theme-accent mr-2">•</span><span>{item}</span></li>
                  ))}
                </ul>
              )}
              
              {/* DEMO CONTENT REMOVED */}

              {tile?.ctaLabel && tile?.ctaHref && (
                <Link href={tile.ctaHref} className="mt-4 inline-block bg-theme-accent hover:bg-theme-accent/80 text-white px-6 py-3 rounded-md font-semibold transition-colors">
                  {tile.ctaLabel} →
                </Link>
              )}
            </div>
          </div>

          {/* --- MOBILE LAYOUT (<md OR landscape phones) --- */}
          {/* REFACTOR: Absolute positioning to force 100% height match with section */}
          {/* Force grid display on landscape phones (md width but short height) */}
          <div className={`md:hidden md:max-h-[600px]:grid absolute inset-0 w-full grid ${isLastTile ? 'grid-rows-[minmax(0,1fr)_auto_auto_auto]' : 'grid-rows-[minmax(0,1fr)_auto_auto]'} gap-0 px-0 pt-0 pb-0`}>
            
            {/* Row 1: Text Content (Flexible Top) */}
            {/* Increased padding to pt-[96px] (80px navbar + 16px gap) to uncrowd the top */}
            {/* Landscape: Reduced padding to pt-20 (80px) to save vertical space */}
            {/* Added pb-8 to ensure text doesn't spill off bottom of scroll area */}
            <div className="flex flex-col gap-4 overflow-y-auto px-6 pb-8 self-start min-h-0 pt-[96px] landscape:pt-20">
              <div>
                {tile?.eyebrow && <p className="text-theme-accent font-bold tracking-widest uppercase text-[10px] mb-1">{tile.eyebrow}</p>}
                {tile?.title && <h2 className="text-2xl font-bold text-slate-900 font-orbitron tracking-wide mb-2">{tile.title}</h2>}
                {tile?.subtitle && <p className="text-sm text-theme-muted leading-relaxed">{tile.subtitle}</p>}
              </div>

              {bullets.length > 0 && (
                <ul className="space-y-1 text-sm text-theme-muted">
                  {bullets.map((item, i) => (
                    <li key={i} className="flex items-start"><span className="text-theme-accent mr-2">•</span><span>{item}</span></li>
                  ))}
                </ul>
              )}
            </div>

            {/* Row 2: Buttons (Fixed above viewer) */}
            <div className="flex flex-row gap-3 px-6 pb-4 w-full z-10 bg-gradient-to-t from-slate-50 to-transparent pt-2 items-end">
              {tile?.ctaLabel && tile?.ctaHref && (
                <Link href={tile.ctaHref} className="flex-1 bg-[#A97142] hover:bg-[#8a5d36] text-white text-xs px-2 py-3 rounded-md font-semibold transition-colors shadow-lg text-center uppercase tracking-widest">
                  {tile.ctaLabel}
                </Link>
              )}
               <Link href="/subscribe" className="flex-1 bg-[#A97142] hover:bg-[#8a5d36] text-white text-xs px-2 py-3 rounded-md font-semibold transition-colors shadow-lg text-center">
                Get Started
              </Link>
            </div>

            {/* Row 3: Bottom Viewer (Fixed Height) */}
            {/* Landscape: Reduced height to save space */}
            <div className="h-[15vh] min-h-[100px] landscape:h-[12vh] landscape:min-h-[80px] w-full px-2 pb-2">
              <div 
                className={mobileViewerClasses}
                onClick={() => setIsExpanded(true)}
              >
                <span className="text-2xl text-theme-accent">▶</span>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mt-1">View</p>
              </div>
            </div>

            {/* Row 4: Footer (Last Tile Only) */}
            {isLastTile && (
              <footer className="w-full text-xs bg-zinc-900/95 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_30px_rgba(0,0,0,0.5)] py-4 px-6 z-30">
                <div className="flex flex-col gap-2 items-center text-center">
                  <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                    <Link href="/about" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">About</Link>
                    <Link href="/contact" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">Contact</Link>
                    <Link href="/subscribe" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">Subscribe</Link>
                    <Link href="/privacy" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">Privacy</Link>
                  </nav>
                  <p className="text-theme-soft text-[10px]">© 2025 Slate360. All rights reserved.</p>
                </div>
              </footer>
            )} 

            {/* Expanded Viewer Overlay */}
            <div className={expandedViewerClasses}>
              <div className="absolute top-4 right-4 z-50">
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="text-xs bg-white/10 px-3 py-1 rounded-full text-white hover:bg-white/20"
                >
                  ✕ Close
                </button>
              </div>
              <span className="text-4xl text-theme-accent mb-2">▶</span>
              <h3 className="text-xl font-semibold text-white text-center">{tile?.viewerTitle || "Viewer"}</h3>
              <p className="text-xs text-theme-muted text-center mt-2 px-8">
                Interactive content loaded here.
              </p>
            </div>

          </div>

        </div>
      </div>

      {isLastTile && (
        <footer className="hidden md:block slate360-footer w-full text-xs shrink-0 absolute bottom-0 left-0 right-0 z-30 bg-zinc-900/95 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-4 px-6 py-6">
            <nav className="flex items-center gap-8">
              <Link href="/about" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">About</Link>
              <Link href="/contact" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">Contact</Link>
              <Link href="/subscribe" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">Subscribe</Link>
              <Link href="/privacy" className="uppercase tracking-wider hover:text-[#A97142] transition-colors">Privacy</Link>
            </nav>
            <p className="text-theme-soft">© 2025 Slate360. All rights reserved.</p>
          </div>
        </footer>
      )}
    </section>
  );
}