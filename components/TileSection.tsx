import MediaViewer from "./MediaViewer";
import Link from "next/link";

type Props = { id: string; title: string; subtitle?: string; description: string; features: string[]; learnHref: string; viewerOn?: "left" | "right"; alt?: boolean; hero?: boolean; viewerStyle?: React.CSSProperties; viewerLeft?: boolean };

export default function TileSection({ id, title, subtitle, description, features, learnHref, viewerOn = "right", alt = false, hero = false, viewerStyle, viewerLeft = false }: Props) {
  // Use a single dark background for all non-alt tiles
  const bg = alt ? "tile-surface-light" : "tile-surface-dark";
  return (
    <section
      id={id}
      className={`min-h-screen snap-start flex items-center ${bg} ${!alt ? 'border-4 border-red-500' : ''}`}
      data-bg={bg}
    >
      <div className={`mx-auto max-w-7xl w-full px-6 md:px-10 py-24 flex flex-col ${viewerOn === 'left' ? 'md:flex-row-reverse' : 'md:flex-row'} gap-6 items-start min-w-0`}>
        <div className="flex-shrink-0 w-full md:w-[40%] h-[60vh] flex items-start justify-center">
          <MediaViewer hero={hero} style={viewerStyle} alt={alt} />
        </div>
        <div className={`flex-1 min-w-0 flex flex-col space-y-4 p-4 md:p-0 ${alt ? '' : 'text-white'}`}>
          <h2 className={`text-4xl font-bold ${alt ? 'text-[var(--ink)]' : 'text-white'}`}>{title}</h2>
          {subtitle && <h3 className={`text-2xl font-semibold text-[var(--brand-copper)] ${alt ? '' : 'text-blue-200'}`}>{subtitle}</h3>}
          <p className={`mt-4 leading-relaxed ${alt ? 'text-[var(--ink-sub)]' : 'text-blue-100/90'}`}>{description}</p>
          <ul className="mt-6 space-y-2">
            {features.map((f, i) => (
              <li key={i} className={`flex items-start gap-3 ${alt ? 'text-[var(--ink)]' : 'text-blue-50'}`}>
                <span className={`mt-[2px] text-[var(--brand-copper)] ${alt ? '' : 'text-blue-200'}`}>▸</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <a href={learnHref} className={`mt-4 font-semibold hover:underline ${alt ? 'text-[var(--brand-blue)]' : 'text-blue-200'}`}>Learn More</a>
        </div>
      </div>
    </section>
  );
}
