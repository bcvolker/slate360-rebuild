import React from "react";
import Link from "next/link";
import MediaViewer from "./MediaViewer";
import MobileViewer from "@/components/ui/MobileViewer";
import { Tile } from "@/lib/types";
import { iconMap } from "@/lib/icon-map";

interface TileSectionProps {
  tile: Tile;
  index: number;
  isLast: boolean;
}

export default function TileSection({ tile, index, isLast }: TileSectionProps) {
  const { id, title, subtitle, description, features, cta, viewerPosition } = tile;
  const isReverse = viewerPosition === "left";
  const viewerWidth = "md:w-[42%]";
  const viewerHeight = "h-[50vh] md:h-[55vh] lg:h-[60vh]";
  const bgClass = index % 2 === 0 ? "bg-tile-base" : "bg-tile-alt";
  const dividerClass = !isLast ? "section-divider" : "";

  return (
    <section
      id={id}
      className={`tile-section bg-animated-gradient relative w-full min-h-[calc(100dvh-5rem)] md:min-h-[calc(100vh-5rem)] md:h-[calc(100vh-5rem)] snap-start grid grid-rows-[1fr_auto_1fr] items-stretch scroll-mt-20 ${bgClass} ${dividerClass} ${id === 'vr' ? 'pb-32' : ''}`}
      data-tile={id}
    >
      {/* DEBUG banner */}
      <div className="w-full bg-yellow-200 text-yellow-900 text-xs font-bold py-1 px-2 border-b border-yellow-400">DEBUG TILE: {id}</div>
      {/* Middle row: content wrapper */}
      <div className="row-start-2 place-self-stretch w-full relative">
        {/* Mobile Layout - now includes viewer */}
        <div
          className={`md:hidden w-full flex flex-col px-6 py-8 border-b border-slate-200/70 last:border-b-0 relative z-10`}
          style={{ paddingBottom: id === 'vr' ? undefined : 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex flex-col gap-4">
            {/* Viewer Section - Mobile */}
            <div className="w-full h-[40vh] max-h-[50vh] rounded-lg shadow-lg overflow-hidden border-4 border-[#B87333] mb-2">
              <MediaViewer id={id} title={title} />
            </div>
            {/* Content Section for Mobile */}
            <div className="flex flex-col">
              <h2 className="text-lg font-bold leading-tight text-brand-ink">{title}</h2>
              <h3 className="text-sm font-semibold text-brand-blue leading-snug">{subtitle}</h3>
              <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
              <Link href="#" className="mt-2 text-brand-copper underline">{cta}</Link>
              {/* Features with icons */}
              {features?.map((feature) => {
                const Icon = iconMap[feature.iconName];
                return (
                  <div key={feature.title} className="flex items-start space-x-4 mt-2">
                    <div className="flex-shrink-0 rounded-lg bg-slate-800 p-3">
                      {Icon && <Icon className="h-6 w-6 text-brand-copper" />}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                      <p className="mt-1 text-slate-400">{feature.text}</p>
                    </div>
                  </div>
                );
              })}
              {/* MobileViewer modal below content */}
              <MobileViewer tile={tile} />
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
                <h2 className="text-3xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--brand-ink)' }}>{title}</h2>
                {subtitle && (
                  <h3 className="text-xl md:text-2xl font-semibold text-[#4B9CD3] leading-snug">{subtitle}</h3>
                )}
                <p className="text-lg md:text-xl text-gray-700 leading-relaxed max-w-prose">{description}</p>
                {/* Features with icons */}
                {features?.map((feature) => {
                  const Icon = iconMap[feature.iconName];
                  return (
                    <div key={feature.title} className="flex items-start space-x-4 mt-2">
                      <div className="flex-shrink-0 rounded-lg bg-slate-800 p-3">
                        {Icon && <Icon className="h-6 w-6 text-brand-copper" />}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                        <p className="mt-1 text-slate-400">{feature.text}</p>
                      </div>
                    </div>
                  );
                })}
                <Link
                  href="#"
                  className="inline-flex items-center gap-2 bg-[#B87333] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#9f5f24] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 shadow-lg w-fit text-base"
                >
                  {cta}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom spacer - ensure last tile is scrollable */}
      <div className={`${id === 'vr' ? 'h-32 md:h-40' : 'h-4 md:h-6'}`} aria-hidden="true" />
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
