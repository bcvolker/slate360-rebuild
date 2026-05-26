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
} from "@/components/marketing-launchpad/marketing-styles";
import { cn } from "@/lib/utils";

type MarketingFeatureSectionProps = {
  tile: MarketingTile;
};

function FeatureCopy({ tile, reversed }: { tile: MarketingTile; reversed?: boolean }) {
  return (
    <div className={cn(TEXT_COLUMN, reversed && "lg:items-end lg:text-right")}>
      <h2 className="mb-3 text-3xl font-bold tracking-tight text-white lg:mb-3 lg:text-4xl lg:text-[#FFFFFF]">
        {tile.title}
      </h2>
      <p className={BODY_COPY}>{tile.description}</p>
      <ul className={cn(FEATURE_LIST, reversed && "lg:items-end")}>
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

export function MarketingFeatureSection({ tile }: MarketingFeatureSectionProps) {
  const copyOrder = tile.reversed ? "order-1 lg:order-2" : "order-1";
  const mediaOrder = tile.reversed ? "order-2 lg:order-1" : "order-2";
  const copyAlign = tile.reversed ? "lg:justify-self-end" : "lg:justify-self-start";
  const mediaAlign = tile.reversed ? "lg:justify-self-start" : "lg:justify-self-end";

  return (
    <section id={tile.id} className={TILE_SECTION_SNAP}>
      <div className={TILE_ROW}>
        <div className={cn(copyOrder, copyAlign)}>
          <FeatureCopy tile={tile} reversed={tile.reversed} />
        </div>
        <div className={cn(MEDIA_COLUMN, mediaOrder, mediaAlign)}>
          <MarketingExpandableMediaFrame variant={tile.media} />
        </div>
      </div>
    </section>
  );
}
