import Link from "next/link";
import type { MarketingTile } from "@/components/marketing-launchpad/marketing-tile-data";
import { MarketingExpandableMediaFrame } from "@/components/marketing-launchpad/MarketingExpandableMediaFrame";
import {
  BODY_COPY,
  CTA_LINK,
  FEATURE_CHEVRON,
  FEATURE_LIST,
  FEATURE_ITEM,
  MEDIA_COLUMN,
  TEXT_COLUMN,
  TILE_ROW,
  TILE_SECTION_SNAP,
  TILE_SECTION_SNAP_LAST,
} from "@/components/marketing-launchpad/marketing-styles";

type MarketingFeatureSectionProps = {
  tile: MarketingTile;
  isLast?: boolean;
};

function FeatureCopy({ tile }: { tile: MarketingTile }) {
  return (
    <div className={TEXT_COLUMN}>
      <h2 className="mb-2 text-3xl font-bold tracking-tight text-white lg:mb-2 lg:text-4xl lg:text-[#FFFFFF]">
        {tile.title}
      </h2>
      <p className={BODY_COPY}>{tile.description}</p>
      <ul className={FEATURE_LIST}>
        {tile.features.map((feature) => (
          <li key={feature} className={FEATURE_ITEM}>
            <span aria-hidden className={FEATURE_CHEVRON}>
              »
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link href={tile.ctaHref} className={`${CTA_LINK} mt-2 w-fit lg:mt-5`}>
        {tile.ctaLabel}
      </Link>
    </div>
  );
}

export function MarketingFeatureSection({ tile, isLast = false }: MarketingFeatureSectionProps) {
  const copyOrder = tile.reversed ? "order-1 lg:order-2" : "order-1";
  const mediaOrder = tile.reversed ? "order-2 lg:order-1" : "order-2";
  const sectionClass = isLast ? TILE_SECTION_SNAP_LAST : TILE_SECTION_SNAP;

  return (
    <section id={tile.id} className={sectionClass}>
      <div className={TILE_ROW}>
        <div className={copyOrder}>
          <FeatureCopy tile={tile} />
        </div>
        <div className={`${MEDIA_COLUMN} ${mediaOrder}`}>
          <MarketingExpandableMediaFrame variant={tile.media} />
        </div>
      </div>
    </section>
  );
}
