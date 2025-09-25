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
    <section id={id} data-tile className="tile-background snap-start h-screen flex items-center justify-center border-b border-slate-200 scroll-mt-[88px]">
      <div className="mx-auto max-w-7xl w-full px-6 md:px-10 tile-content flex items-center justify-center min-h-0">
        {/* Desktop layout */}
        <div className={`hidden md:flex ${rowDir} gap-10 items-center w-full h-full max-h-[80vh]`}>
          {/* Viewer */}
          <div className={`flex-shrink-0 ${viewerSize} flex items-center justify-center`}>
            <MediaViewer id={id} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
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
        <div className="md:hidden flex flex-col gap-8 items-center justify-center w-full h-full max-h-[80vh] py-8">
          {/* Text content */}
          <div className="text-center px-6 flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-extrabold tracking-tight">{title}</h2>
            {subtitle && (
              <h3 className="mt-2 text-xl font-semibold text-[var(--brand-blue)]">
                {subtitle}
              </h3>
            )}
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {description}
            </p>
            <ul className="mt-6 space-y-2 text-left max-w-sm mx-auto">
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

          {/* Small thumbnail viewer - centered */}
          <div className="w-40 h-24 flex-shrink-0">
            <MediaViewer id={id} />
          </div>
        </div>
      </div>
    </section>
  );
}