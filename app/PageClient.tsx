
"use client";

import TileSection from '../components/TileSection';
import Footer from '../components/Footer';
import type { Tile as LibTile } from '@/lib/tile-data';

export default function PageClient({ tileData }: { tileData: LibTile[] }) {
  return (
    <>
      {/* snap container wrapper is provided by parent <main> */}
      {tileData.map((tile) => (
        <section
          key={tile.id}
          id={tile.id}
          className="min-h-screen h-screen snap-start flex items-center justify-center border-b border-slate-200 scroll-mt-[60px]"
        >
          <TileSection
            id={tile.id}
            title={tile.title}
            subtitle={tile.subtitle}
            description={tile.description}
            features={tile.features}
            learnHref={tile.id === 'hero' ? '/about' : `/features/${tile.id}`}
            viewerOn={tile.viewerPosition}
            hero={tile.id === 'hero'}
          />
        </section>
      ))}
      <Footer />
    </>
  );
}
