
"use client";

import TileSection from '../components/TileSection';
import type { Tile as LibTile } from '@/lib/tile-data';

export default function PageClient({ tileData }: { tileData: LibTile[] }) {
  return (
    <>
      {/* snap container wrapper is provided by parent <main> */}
      {tileData.map((tile) => (
        <TileSection
          key={tile.id}
          id={tile.id}
          title={tile.title}
          subtitle={tile.subtitle}
          description={tile.description}
          features={tile.features}
          learnHref={tile.id === 'hero' ? '/about' : `/features/${tile.id}`}
          viewerOn={tile.viewerPosition}
          hero={tile.id === 'hero'}
        />
      ))}
    </>
  );
}
