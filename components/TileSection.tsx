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
    ? "w-full md:w-[50%] max-w-3xl h-[70vh]"
    : "w-full md:w-[40%] max-w-2xl h-[60vh]";
  const rowDir =
    viewerOn === "left" ? "md:flex-row-reverse" : "md:flex-row";

  return (
  <div id={id} className="tile-background min-h-screen h-screen snap-start flex items-center justify-center border-b border-slate-200">
  <div className="mx-auto max-w-7xl w-full px-6 md:px-10 py-24 tile-content">
        <div className={`flex flex-col ${rowDir} gap-10 items-start`}>
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
      </div>
    </div>
  );
}
