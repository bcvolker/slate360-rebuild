
"use client";
import React from "react";
import TileSection from '../components/TileSection';
import WaveDivider from '../components/ui/WaveDivider';
import type { Tile as LibTile } from '@/lib/tile-data';

export default function PageClient({ tileData }: { tileData: LibTile[] }) {
  return (
    <>
      {/* snap container wrapper is provided by parent <main> */}
      {tileData.map((tile, idx) => (
        <React.Fragment key={tile.id}>
          <TileSection
            id={tile.id}
            title={tile.title}
            subtitle={tile.subtitle}
            description={tile.description}
            features={tile.features}
            learnHref={tile.id === 'hero' ? '/about' : `/features/${tile.id}`}
            viewerOn={tile.viewerPosition}
            hero={tile.id === 'hero'}
            isAlt={idx % 2 === 1}
            isHero={idx === 0}
            hasDivider={idx < tileData.length - 1}
          />
          {idx < tileData.length - 1 && (
            <>
              {console.log("🌊 Divider for tile:", tile.id)}
              <WaveDivider />
            </>
          )}
        </React.Fragment>
      ))}
    </>
  );
}
