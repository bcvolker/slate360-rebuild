import Link from "next/link";
import type { MarketingTile } from "@/components/marketing-launchpad/marketing-tile-data";
import { MarketingMediaPanel } from "@/components/marketing-launchpad/MarketingMediaPanel";
import { CTA_LINK, TILE_SECTION } from "@/components/marketing-launchpad/marketing-styles";

type MarketingFeatureSectionProps = {
  tile: MarketingTile;
};

function FeatureCopy({ tile }: { tile: MarketingTile }) {
  return (
    <div className="flex w-full flex-col justify-center lg:w-[40%]">
      <h2 className="text-3xl font-bold tracking-tight text-[#FFFFFF] lg:text-4xl">{tile.title}</h2>
      <p className="mt-5 text-base leading-relaxed text-[#F8FAFC]">{tile.description}</p>
      <ul className="mt-6 grid gap-4">
        {tile.features.map((feature) => (
          <li key={feature.title} className="rounded-xl border border-white/[0.05] bg-slate-900/30 p-4">
            <p className="text-sm font-semibold text-[#FFFFFF]">
              <span aria-hidden className="mr-2">{feature.icon}</span>
              {feature.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#A3AED0]">{feature.body}</p>
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
    <div className="flex w-full flex-1 items-center justify-center lg:w-[60%]">
      <MarketingMediaPanel variant={tile.media} />
    </div>
  );

  return (
    <section id={tile.id} className={TILE_SECTION}>
      <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col lg:flex-row lg:items-center lg:gap-10">
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
