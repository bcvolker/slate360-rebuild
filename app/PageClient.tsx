
import React from 'react';
import clsx from 'clsx';
import { Tile } from '@/lib/tile-data';
import Image from 'next/image';
import Button from '@/components/ui/button';
import SectionHeader from '@/components/ui/SectionHeader';
import Footer from '@/components/ui/Footer';

interface HomePageClientProps {
  tiles: Tile[];
}

export default function HomePageClient({ tiles }: HomePageClientProps) {
  return (
    <main className="scroll-container">
      {tiles.map((tile, index) => (
        <TileSection 
          key={tile.id} 
          tile={tile} 
          isLast={index === tiles.length - 1} 
        />
      ))}
    </main>
  );
}

function TileSection({ tile, isLast }: { tile: Tile; isLast: boolean }) {
  const { id, title, subtitle, description, features, cta, viewerPosition, theme, media } = tile;
  const viewerOnLeft = viewerPosition === 'left';
  const isLight = theme === 'light';

  return (
    <section
      id={id}
      className={clsx('tile-section', {
        'tile-surface-light': isLight,
        'tile-surface-dark': !isLight,
      })}
    >
      <div
        className={clsx(
          'w-full max-w-7xl mx-auto flex flex-col items-center gap-8 md:gap-12',
          {
            'md:flex-row': !viewerOnLeft,
            'md:flex-row-reverse': viewerOnLeft,
          }
        )}
      >
        {/* === VIEWER COLUMN (Fixed Width) === */}
        <div className="w-full md:w-2/5 flex-shrink-0">
          <div className="viewer-container relative aspect-[16/10] w-full flex items-center justify-center bg-black/10">
            {media ? (
              <Image src={media.src} alt={media.alt} fill className="object-cover" />
            ) : (
              <span className="text-sm opacity-50">Media Viewer</span>
            )}
          </div>
        </div>

        {/* === TEXT CONTENT COLUMN (Expanding) === */}
        <div className="flex-1 min-w-0 flex flex-col w-full">
          <SectionHeader title={title} subtitle={subtitle} align="left" />
          <p className="mt-4 text-lg leading-relaxed">{description}</p>
          <ul className="mt-6 space-y-3">
            {features?.map((feature, i) => (
              <li key={i} className="flex items-start gap-3 feature-text">
                <span className="mt-1 text-[var(--brand-copper)] font-bold">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button>{cta}</Button>
          </div>
        </div>
      </div>
      {isLast && <Footer />}
    </section>
  );
}
