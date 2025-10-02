
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
      className={`snap-start w-full flex items-center justify-center border-b border-slate-300/30 text-white ${bgClass}`}
      style={{ minHeight: 'calc(100vh - 5rem)' }} // 5rem = h-20 header
    >
      <div className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24">
        {/* Responsive: side-by-side on mobile and desktop */}
        <div className={`flex w-full flex-col md:flex-row ${viewerOnLeft ? 'md:flex-row-reverse' : ''} gap-8`}>
          {/* Text Content */}
          <div className="flex w-full flex-1 flex-col md:w-1/2">
            <SectionHeader title={title} subtitle={subtitle} />
            <p className="mt-4 text-lg leading-relaxed">{description}</p>
            <ul className="mt-6 space-y-3">
              {features?.map((feature: { text: string }, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 font-bold text-brand-copper">&#10003;</span>
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button>{cta}</Button>
            </div>
          </div>

          {/* Viewer: always visible, side-by-side on all screens */}
          <div className="flex w-full flex-1 items-center justify-center md:w-1/2">
            <MediaViewer id={id} title={title} />
          </div>
        </div>
      </div>
    </section>
  );
}
