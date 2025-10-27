import { Tile, Feature } from "@/lib/types";
import SectionHeader from "./ui/SectionHeader";
import Button from "./ui/Button";
import MediaViewer from "./MediaViewer";
import MobileViewerLauncher from "./MobileViewerLauncher";

type TileWithIndex = { tile: Tile; index: number; isLast?: boolean; };

export default function TileSection({ tile, index, isLast = false }: TileWithIndex) {
  const { id, title, subtitle, description, features, cta, viewerPosition } = tile;
  const viewerOnLeft = viewerPosition === 'left';

  // Alternate simple background colors for tiles (designer may replace with palette later)
  const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';

  const viewerOrderClass = viewerOnLeft ? 'md:order-2' : 'md:order-1';
  const textOrderClass = viewerOnLeft ? 'md:order-1' : 'md:order-2';

  return (
    <section id={id} className={`w-full ${bgClass} text-slate-900 tile-section`}>
      <div className="w-full max-w-7xl mx-auto px-6 py-12 md:py-20">
  <div className={`grid gap-8 items-center md:grid-cols-2 ${viewerOnLeft ? 'md:grid-flow-col-dense' : ''}`}>
          {/* Viewer side */}
          <div className={`order-1 ${viewerOrderClass} flex items-center justify-center`}>
            <div className="w-full md:w-10/12">
              <div className="w-full h-full rounded-lg overflow-hidden">
                <MediaViewer id={id} title={title} />
              </div>
            </div>
          </div>

          {/* Text side */}
          <div className={`order-2 ${textOrderClass} flex flex-col justify-center`}>
            <SectionHeader title={title} subtitle={subtitle} />
            <p className="mt-4 text-lg leading-relaxed text-slate-700">{description}</p>
            {features && (
              <ul className="mt-6 space-y-2">
                {features.map((feature: Feature, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700">
                    <span className="mt-1 text-brand-copper">▸</span>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6">
              <Button>{cta}</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
