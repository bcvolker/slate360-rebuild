
import { Tile } from "@/lib/types";
import SectionHeader from "./ui/SectionHeader";
import Button from "./ui/Button";
import MediaViewer from "./MediaViewer";
import MobileViewerLauncher from "./MobileViewerLauncher";

type TileWithIndex = { tile: Tile; index: number; isLast?: boolean; };

export default function TileSection({ tile, index, isLast = false }: TileWithIndex) {
  const { id, title, subtitle, description, features, cta, viewerPosition } = tile;
  const viewerOnLeft = viewerPosition === 'left';


  // All tiles use the same pink background for consistency
  const bgClass = 'bg-pink-100/30';

  return (
    <section
      id={id}
      className={`snap-start w-full flex items-center justify-center border-b border-slate-800 text-white ${bgClass}`}
      style={{ minHeight: 'calc(100vh - 5rem)' }} // 5rem = h-20 header
    >
      <div className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className={`flex w-full flex-col items-center gap-8 md:flex-row ${viewerOnLeft ? 'md:flex-row-reverse' : ''}`}> 
          {/* Text Content */}
          <div className="flex w-full flex-1 flex-col md:w-1/2">
            <SectionHeader title={title} subtitle={subtitle} />
            <p className="mt-4 text-lg leading-relaxed">{description}</p>
            <ul className="mt-6 space-y-3">
              {features?.map((feature: { text: string }, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 font-bold text-brand-copper"></span>
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button>{cta}</Button>
            </div>
          </div>

          {/* Viewer (desktop) */}
          <div className="hidden w-full flex-1 md:flex md:w-1/2 md:items-center md:justify-center">
            <MediaViewer id={id} title={title} />
          </div>
        </div>
        {/* Mobile viewer always visible below content */}
        <div className="mt-8 md:hidden">
          <MobileViewerLauncher tile={tile} />
        </div>
      </div>
    </section>
  );
}
