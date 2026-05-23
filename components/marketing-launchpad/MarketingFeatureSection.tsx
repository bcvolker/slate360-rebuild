import Link from "next/link";
import type { MarketingTile } from "@/components/marketing-launchpad/marketing-tile-data";
import { MarketingMediaPanel } from "@/components/marketing-launchpad/MarketingMediaPanel";
import {
  BODY_COPY,
  CTA_LINK,
  FEATURE_GRID,
  FEATURE_ITEM,
  MEDIA_COLUMN,
  TEXT_COLUMN,
  TILE_SECTION,
} from "@/components/marketing-launchpad/marketing-styles";

type MarketingFeatureSectionProps = {
  tile: MarketingTile;
};

function FeatureCopy({ tile }: { tile: MarketingTile }) {
  return (
    <div className={TEXT_COLUMN}>
      <h2 className="text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">{tile.title}</h2>
      <p className={`mt-5 ${BODY_COPY}`}>{tile.description}</p>
      <ul className={FEATURE_GRID}>
        {tile.features.map((feature) => (
          <li key={feature} className={FEATURE_ITEM}>
            <span aria-hidden className="shrink-0 text-[#00E699]">
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link href={tile.ctaHref} className={`${CTA_LINK} mt-8 w-fit`}>
        {tile.ctaLabel}
      </Link>
    </div>
  );
}

export function MarketingFeatureSection({ tile }: MarketingFeatureSectionProps) {
  const media = (
    <div className={MEDIA_COLUMN}>
      <MarketingMediaPanel variant={tile.media} />
    </div>
  );

  return (
    <section id={tile.id} className={TILE_SECTION}>
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col lg:flex-row lg:items-center lg:gap-8">
        {tile.reversed ? (
          <>
            {media}
            <FeatureCopy tile={tile} />
          </>
        ) : (
          <>
            <FeatureCopy tile={tile} />
            {media}
          </>
        )}
      </div>
    </section>
  );
}
