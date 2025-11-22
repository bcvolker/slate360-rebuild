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

export default function TileSection({ tile, index }: TileSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isReversed = index % 2 === 1;
  const isFirstTile = index === 0;
  const isLastTile = index === 7; // Adjust based on total tiles
  const bullets: string[] = Array.isArray(tile?.bullets) ? tile?.bullets : [];

  const toggleViewer = () => {
    // Only toggle on mobile (when not lg)
    if (window.innerWidth < 1024) {
      setIsExpanded(!isExpanded);
    }
  };

  // Viewer Classes
  // Mobile: Flex item, order 2 (bottom), small height unless expanded
  // Desktop: Floated, specific size
  const viewerClasses = `
    relative z-20 transition-all duration-300 ease-in-out
    flex flex-col items-center justify-center
    bg-slate-900 border-2 border-dotted border-red-500
    tile-viewer-surface

    /* MOBILE STYLES */
    w-full order-2
    ${isExpanded 
      ? 'fixed bottom-0 left-0 right-0 h-[70vh] z-50 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] border-t border-theme-accent/50' 
      : 'h-64 rounded-xl mt-6 border-white/10 hover:bg-slate-800/50 cursor-pointer'
    }

    /* DESKTOP STYLES (Reset mobile) */
    lg:static lg:flex lg:order-unset lg:w-[460px] lg:h-[336px] lg:rounded-3xl lg:p-8 lg:mb-12 lg:mt-0 lg:cursor-default lg:hover:bg-slate-900
    ${isFirstTile ? "lg:max-w-[550px] lg:h-[400px]" : ""}
    ${isReversed ? "lg:float-left lg:mr-12" : "lg:float-right lg:ml-12"}
  `;

  // Text Classes
  // Mobile: Order 1 (top)
  // Desktop: Wraps around float
  const textClasses = `
    tile-text-surface block
    
    /* MOBILE STYLES */
    order-1 w-full pb-4

    /* DESKTOP STYLES */
    lg:order-unset lg:pb-12 lg:-ml-12
  `;

  return (
    <section
      id={tile?.id}
      data-snap="tile"
      className={`relative min-h-screen snap-start overflow-hidden flex flex-col ${isFirstTile ? "debug-section-center" : ""}`}
      style={{ paddingTop: "var(--navbar-height)", paddingBottom: isLastTile ? "0" : "var(--navbar-height)" }}
    >
      <div className="flex-1 flex items-start pt-8 lg:pt-40">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
          
          {/* Container: Flex Col on Mobile, Block on Desktop */}
          <div className="relative w-full clearfix flex flex-col lg:flow-root">
            
            {/* VIEWER */}
            <div 
              className={viewerClasses}
              onClick={toggleViewer}
            >
              {/* Mobile Expand/Collapse Controls */}
              <div className="lg:hidden absolute top-2 right-4 z-30">
                {isExpanded ? (
                  <button className="text-xs bg-white/10 px-2 py-1 rounded-full text-white">✕ Close</button>
                ) : (
                  <span className="text-xs text-slate-500">Tap to expand</span>
                )}
              </div>

              <span className="text-2xl lg:text-4xl text-theme-accent mb-1 lg:mb-2">▶</span>
              {tile?.viewerTitle && <h3 className="hidden lg:block text-xl font-semibold text-white text-center">{tile.viewerTitle}</h3>}
              
              {/* Mobile Title (Visible when collapsed) */}
              <div className="lg:hidden text-center">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{tile?.viewerTitle || "Viewer"}</p>
              </div>

              <p className="text-[10px] lg:text-xs text-theme-muted text-center mt-1 leading-tight hidden lg:block">
                Tap or click to expand and explore. Future versions will load 3D models, videos, or 360 tours here.
              </p>
            </div>

            {/* TEXT CONTENT */}
            <div className={textClasses}>
              {tile?.eyebrow && <p className="text-theme-accent font-bold tracking-widest uppercase text-xs mb-2">{tile.eyebrow}</p>}
              {tile?.title && <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 font-orbitron tracking-wide mb-4">{tile.title}</h2>}
              {tile?.subtitle && <p className="text-lg text-theme-muted leading-relaxed mb-4">{tile.subtitle}</p>}
              {bullets.length > 0 && (
                <ul className="space-y-2 text-theme-muted mb-6">
                  {bullets.map((item, i) => (
                    <li key={i} className="flex items-start"><span className="text-theme-accent mr-2">•</span><span>{item}</span></li>
                  ))}
                </ul>
              )}
              
              {/* DEMO CONTENT: Only on first tile to show expansion */}
              {isFirstTile && (
                <div className="mt-4 p-4 bg-yellow-100/10 border border-yellow-500/50 rounded text-sm text-theme-muted">
                  <p className="font-bold text-yellow-500 mb-2">DEMO: Extra Content Expansion</p>
                  <p>
                    This is extra content to demonstrate that the text area expands and wraps around the viewer. 
                    As you add more text here, it will flow down the side of the viewer and eventually wrap underneath it, 
                    filling the full width of the container.
                  </p>
                </div>
              )}

              {tile?.ctaLabel && tile?.ctaHref && (
                <Link href={tile.ctaHref} className="mt-4 inline-block bg-theme-accent hover:bg-theme-accent/80 text-white px-6 py-3 rounded-md font-semibold transition-colors">
                  {tile.ctaLabel} →
                </Link>
              )}
            </div>

          </div>
        </div>
      </div>

      {isLastTile && (
        <footer className="slate360-footer w-full text-xs shrink-0 mt-auto">
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