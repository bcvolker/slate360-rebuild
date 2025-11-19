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
    <section
      className="
        snap-start
        min-h-screen
        bg-slate360-charcoal
        px-4
        pt-24
        pb-10
        flex
        flex-col
        justify-start
      "
    >
      {/* Main card */}
      <div
        className="
          rounded-2xl
          border border-slate360-blue/30
          bg-slate360-panel/90
          p-6
          shadow-blueGlow
          backdrop-blur-sm
          space-y-4
        "
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate360-blue">
          Slate360
        </p>

        <h2 className="font-orbitron text-2xl text-slate-50">{title}</h2>

        <p className="text-sm text-slate-300 leading-relaxed">
          {copy}
        </p>

        {features.length > 0 && (
          <ul className="space-y-2">
            {features.slice(0, 3).map((f, i) => (
              <li
                key={i}
                className="text-xs text-slate-400 flex gap-2"
              >
                <span className="text-slate360-copper">•</span>
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Viewer thumbnail */}
      <div className="mt-6 w-full h-14 rounded-xl border border-slate360-blue/30 flex items-center justify-center bg-slate360-charcoalSoft cursor-pointer">
        <span className="text-[11px] uppercase font-bold text-slate360-blue">
          Tap to View 3D Model ↗
        </span>
      </div>

      {/* CTA */}
      <div className="mt-4">
        <Link
          href={ctaHref}
          className="
            block
            w-full
            py-3
            text-center
            rounded-xl
            bg-slate360-blue
            text-white
            font-bold
            uppercase
            text-[11px]
            tracking-widest
          "
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
