import Link from "next/link";
import MediaViewer from "./MediaViewer";

type Props = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  features: string[];
  learnHref: string;
  viewerOn?: "left" | "right";
  hero?: boolean;
};

export default function TileSection({
  id,
  title,
  subtitle,
  description,
  features,
  learnHref,
  viewerOn = "right",
  hero = false,
}: Props) {
  const viewerSize = hero
    ? "w-[50%] max-w-2xl h-[70vh]"
    : "w-[40%] max-w-xl h-[60vh]";
  const rowDir =
    viewerOn === "left" ? "md:flex-row-reverse" : "md:flex-row";

  return (
  <section id={id} className="tile-background snap-start min-h-screen flex items-center">
  <div className="mx-auto max-w-7xl w-full px-6 md:px-10 py-24 tile-content">
        {/* Desktop layout */}
        <div className={`hidden md:flex ${rowDir} gap-10 items-start`}>
          {/* Viewer */}
          <div className={`flex-shrink-0 ${viewerSize} flex items-start justify-center`}>
            <MediaViewer id={id} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0 flex flex-col justify-start">
            <h2 className="text-5xl font-extrabold tracking-tight">{title}</h2>
            {subtitle && (
              <h3 className="mt-2 text-2xl font-semibold text-[var(--brand-blue)]">
                {subtitle}
              </h3>
            )}
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              {description}
            </p>
            <ul className="mt-6 space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-[2px] text-[var(--brand-copper)]">▸</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={learnHref}
              className="mt-8 inline-flex items-center gap-2 text-[var(--brand-blue)] font-semibold hover:underline"
            >
              Learn more →
            </Link>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden flex flex-col gap-6">
          {/* Text content */}
          <div className="text-center px-4">
            <h2 className="text-3xl font-extrabold tracking-tight">{title}</h2>
            {subtitle && (
              <h3 className="mt-2 text-xl font-semibold text-[var(--brand-blue)]">
                {subtitle}
              </h3>
            )}
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {description}
            </p>
            <ul className="mt-6 space-y-2 text-left">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-[2px] text-[var(--brand-copper)]">▸</span>
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={learnHref}
              className="mt-6 inline-flex items-center gap-2 text-[var(--brand-blue)] font-semibold hover:underline"
            >
              Learn more →
            </Link>
          </div>

          {/* Small thumbnail viewer - alternating position */}
          <div className={`w-32 h-20 ${viewerOn === 'left' ? 'self-start ml-4' : 'self-end mr-4'}`}>
            <MediaViewer id={id} />
          </div>
        </div>
      </div>
    </section>
  );
}