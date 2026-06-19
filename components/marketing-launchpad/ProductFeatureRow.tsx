import type { ReactNode } from "react";

type FeatureRowProps = {
  eyebrow: string;
  title: string;
  lead: string;
  points?: { label: string; body: string }[];
  /** Visual for this row — a ProductMediaFrame, video, or interactive embed. */
  media: ReactNode;
  /** Flip media to the right (alternate down the page). */
  reverse?: boolean;
};

/**
 * A media-rich marketing row: a large visual on one side, copy + detail points
 * on the other, alternating sides down the page. Stacks media-first on mobile.
 */
export function ProductFeatureRow({ eyebrow, title, lead, points, media, reverse }: FeatureRowProps) {
  return (
    <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
      <div className={reverse ? "lg:order-2" : undefined}>{media}</div>
      <div className={reverse ? "lg:order-1" : undefined}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#00E699]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold text-[#FFFFFF] lg:text-3xl">{title}</h2>
        <p className="mt-3 text-base leading-relaxed text-[#A3AED0]">{lead}</p>
        {points && points.length > 0 ? (
          <dl className="mt-6 space-y-4">
            {points.map((point) => (
              <div key={point.label} className="border-l-2 border-[#00E699]/30 pl-4">
                <dt className="text-sm font-bold text-[#F8FAFC]">{point.label}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-[#A3AED0]">{point.body}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
