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
    <section
      id={id}
      className={`snap-child w-full flex items-center justify-center border-b border-slate-800 text-white tile-section min-h-screen md:h-[100dvh]`}
    >
      <div className={`w-full max-w-7xl mx-auto px-6 ${topPaddingClass} ${bottomPaddingClass}`}>
        <div className={`flex w-full flex-col items-center gap-8 md:flex-row ${viewerOnLeft ? 'md:flex-row-reverse' : ''}`}> 
          {/* Text Content */}
          <div className="flex w-full flex-1 flex-col md:w-1/2">
            <SectionHeader title={title} subtitle={subtitle} />
            <p className="mt-4 text-lg leading-relaxed">{description}</p>
            <ul className="mt-6 space-y-3">
              {features?.map((feature: { text: string }, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1 font-bold text-brand-copper">✓</span>
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button>{cta}</Button>
            </div>
          </div>

          {/* Viewer (desktop) - server-visible wrapper for tests */}
          <div className="hidden w-full md:flex md:w-1/2 md:items-center md:justify-center md:h-auto">
            <div className="rounded-2xl bg-slate-900 p-8 md:p-10 h-full flex flex-col gap-6">
              <div className="MediaViewer w-full h-full overflow-hidden">
                <MediaViewer id={id} title={title} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 md:hidden MobileViewer">
          <MobileViewerLauncher tile={tile} />
        </div>
      </div>
    </section>
  );
}
