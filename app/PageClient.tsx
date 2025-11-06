"use client";
import React from "react";
import TileSection from "@/components/TileSection";
import WaveDivider from "@/components/ui/WaveDivider";
import { Tile } from "@/lib/types";

export default function PageClient({ tileData }: { tileData: Tile[] }) {
  return (
    <>
      {tileData.map((tile, index) => (
        <div key={tile.id}>
          <TileSection tile={tile} index={index} isLast={index === tileData.length - 1} />
          {index < tileData.length - 1 && <WaveDivider flip={index % 2 === 0} />}
        </div>
      ))}
    </>
  );
}
