import Link from "next/link";
import type { MarketingTile } from "@/components/marketing-launchpad/marketing-tile-data";
import { MarketingExpandableMediaFrame } from "@/components/marketing-launchpad/MarketingExpandableMediaFrame";
import {
  BODY_COPY,
  CTA_LINK,
  FEATURE_CHEVRON,
  FEATURE_GRID,
  FEATURE_ITEM,
  TEXT_COLUMN,
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
      <ul className={FEATURE_GRID}>
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
  return (
    <section id={tile.id} className={TILE_SECTION}>
      <div
        className={`mx-auto flex h-full w-full flex-col lg:flex-row lg:items-center lg:gap-10 ${
          tile.reversed ? "lg:flex-row-reverse" : ""
        }`}
      >
        <FeatureCopy tile={tile} />
        <MarketingExpandableMediaFrame variant={tile.media} />
      </div>
    </section>
  );
}
