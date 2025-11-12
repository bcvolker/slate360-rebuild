import { Tile } from "@/lib/types";
import SectionHeader from "./ui/SectionHeader";
import Button from "./ui/Button";
import MediaViewer from "./MediaViewer";
import MobileViewerLauncher from "./MobileViewerLauncher";

type TileWithIndex = { tile: Tile; index: number; isLast?: boolean; };

export default function TileSection({ tile, index, isLast = false }: TileWithIndex) {
  const { id, title, subtitle, description, features, cta, viewerPosition } = tile;
  const viewerOnLeft = viewerPosition === 'left';

  const topPaddingClass = index === 0 ? 'pt-8 md:pt-10' : 'pt-16 md:pt-20';
  const bottomPaddingClass = 'pb-16 md:pb-20';

  // Alternate backgrounds for each tile
  return (
    <section id={id} className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-7xl mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
        <div className={`w-full ${viewerOnLeft ? 'md:col-start-2 md:col-end-3' : 'md:col-start-1 md:col-end-2'}`}>
          {/* Text Content */}
          <div className="w-full">
            <SectionHeader title={title} subtitle={subtitle} />
            <p className="mt-4 text-lg leading-relaxed">{description}</p>
            <ul className="mt-6 space-y-3">
              {(features || []).map((f, i: number) => {
                const text = (typeof f === 'object' && f !== null && 'text' in f) ? (f as { text?: string }).text : String(f);
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 font-bold text-brand-copper">✓</span>
                    <span>{text}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-8">
              <Button>{cta}</Button>
            </div>
          </div>
        </div>

        <div className={`w-full ${viewerOnLeft ? 'md:col-start-1 md:col-end-2' : 'md:col-start-2 md:col-end-3'} hidden md:flex items-center justify-center`}>
          <div className="relative overflow-hidden w-full">
            <div className="w-full h-72 md:h-96">
              <MediaViewer id={id} title={title} />
            </div>
          </div>
        </div>

        {/* Mobile viewer placed as its own row for small screens */}
        <div className="md:hidden mt-8 MobileViewer">
          <MobileViewerLauncher tile={tile} />
        </div>
      </div>
    </section>
  );
}
