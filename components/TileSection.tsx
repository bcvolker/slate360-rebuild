import MediaViewer from "./MediaViewer";
import Link from "next/link";

type Props = { id: string; title: string; subtitle?: string; description: string; features: string[]; learnHref: string; viewerOn?: "left" | "right"; alt?: boolean; hero?: boolean; viewerStyle?: React.CSSProperties; viewerAlignStyle?: React.CSSProperties; viewerLeft?: boolean };

export default function TileSection({ id, title, subtitle, description, features, learnHref, viewerOn = "right", alt = false, hero = false, viewerStyle, viewerAlignStyle = {}, viewerLeft = false }: Props) {
  // Use a single dark background for all non-alt tiles
  const bg = alt ? "tile-surface-light" : "tile-surface-dark";
  // For the first tile, move the viewer further left by adjusting grid columns
  const cols = viewerLeft
    ? "md:grid-cols-[0.8fr,1.2fr]"
    : viewerOn === "left"
      ? "md:grid-cols-[auto,1fr]"
      : "md:grid-cols-[1fr,auto]";
  // For alt (white) tiles, reduce vertical padding and align items to start
  const altPad = alt ? "py-8 items-start" : "py-16 items-center";
  return (
    <section
      id={id}
      className={`min-h-screen snap-start flex justify-center ${bg} ${alt ? 'items-start' : 'items-center'}`}
    >
      <div className={`mx-auto max-w-7xl w-full px-6 ${altPad} grid ${cols} gap-6${alt ? ' mt-16' : ''}`}>
        <div className="flex justify-center">
          <MediaViewer hero={hero} style={{...viewerAlignStyle, ...viewerStyle}} />
        </div>
        <div className={`flex flex-col gap-4${viewerLeft ? ' ml-8' : ''}`}>
          <h2 className="text-4xl font-bold">{title}</h2>
          {subtitle && <h3 className="text-xl text-[var(--brand-copper)]">{subtitle}</h3>}
          <p className="text-gray-300">{description}</p>
          <ul className="list-disc pl-5 space-y-2">
            {features.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
          <Link href={learnHref} className="text-[var(--brand-blue)] hover:underline">Learn More</Link>
        </div>
      </div>
    </section>
  );
}
