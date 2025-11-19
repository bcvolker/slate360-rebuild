import Link from "next/link";

interface Props {
  title: string;
  copy: string;
  ctaLabel?: string;
  ctaHref?: string;
  features?: string[];
}

export default function MobileTileContent({
  title,
  copy,
  ctaLabel = "Learn More",
  ctaHref = "#",
  features = [],
}: Props) {
  return (
    <section className="flex min-h-screen flex-col bg-slate360-charcoal px-6 pt-24 pb-16 snap-start">
      {/* MAIN TEXT CARD */}
      <div className="flex-1 flex flex-col justify-center space-y-4 rounded-2xl border border-slate360-blue/30 bg-slate360-panel/90 p-8 shadow-blueGlow backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate360-blue">
          Slate360
        </p>
        <h2 className="font-orbitron text-3xl text-slate-50">{title}</h2>
        <p className="text-sm text-slate-300 leading-relaxed line-clamp-6">
          {copy}
        </p>

        {/* Feature bullets (max 3) */}
        {features.length > 0 && (
          <ul className="space-y-2">
            {features.slice(0, 3).map((f, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-400">
                <span className="text-slate360-copper">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* MINI VIEWER STRIP */}
      <div className="mt-6 h-16 w-full cursor-pointer rounded-xl border border-slate360-blue/30 bg-slate360-charcoalSoft flex items-center justify-center">
        <span className="text-xs font-bold uppercase tracking-widest text-slate360-blue">
          Tap to view 3D model ↗
        </span>
      </div>

      {/* CTA BUTTON */}
      <div className="mt-4">
        <Link
          href={ctaHref}
          className="block w-full rounded-xl bg-slate360-blue py-4 text-center text-xs font-bold uppercase tracking-widest text-white hover:bg-slate360-blue/90"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
