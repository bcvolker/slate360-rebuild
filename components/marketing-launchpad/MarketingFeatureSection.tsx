import Link from "next/link";
import type { MarketingTile } from "@/components/marketing-launchpad/marketing-tile-data";
import { MarketingExpandableMediaFrame } from "@/components/marketing-launchpad/MarketingExpandableMediaFrame";
import {
  BODY_COPY,
  CTA_LINK,
  FEATURE_CHEVRON,
  FEATURE_LIST,
  FEATURE_ITEM,
  TEXT_COLUMN,
  TILE_ROW,
  TILE_SECTION,
} from "@/components/marketing-launchpad/marketing-styles";

type MarketingFeatureSectionProps = {
  tile: MarketingTile;
};

function FeatureCopy({ tile }: { tile: MarketingTile }) {
  return (
    <div className={TEXT_COLUMN}>
      <h2 className="mb-3 text-3xl font-bold tracking-tight text-white lg:text-4xl lg:text-[#FFFFFF]">
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
      <Link href={tile.ctaHref} className={`${CTA_LINK} mt-2 w-fit lg:mt-8`}>
        {tile.ctaLabel}
      </Link>
    </div>
  );
}

export function MarketingFeatureSection({ tile }: MarketingFeatureSectionProps) {
  const copyOrder = tile.reversed ? "order-1 lg:order-2" : "order-1";
  const mediaOrder = tile.reversed ? "order-2 lg:order-1" : "order-2";

  return (
    <section id={tile.id} className={TILE_SECTION}>
      <div className={TILE_ROW}>
        <div className={copyOrder}>
          <FeatureCopy tile={tile} />
        </div>
        <div className={mediaOrder}>
          <MarketingExpandableMediaFrame variant={tile.media} />
        </div>
      </div>
    </section>
  );
}
