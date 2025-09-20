import MediaViewer from "./MediaViewer";
import Link from "next/link";

type Props = { id: string; title: string; subtitle?: string; description: string; features: string[]; learnHref: string; viewerOn?: "left" | "right"; alt?: boolean; hero?: boolean; viewerStyle?: React.CSSProperties; viewerLeft?: boolean };

export default function TileSection({ id, title, subtitle, description, features, learnHref, viewerOn = "right", alt = false, hero = false, viewerStyle, viewerLeft = false }: Props) {
  // Use a single dark background for all non-alt tiles
  const bg = alt ? "tile-surface-light" : "tile-surface-dark";
  // Use the same grid column structure for all tiles
  const cols = viewerOn === "left"
    ? "md:grid-cols-[auto,1fr]"
    : "md:grid-cols-[1fr,auto]";
  // Use the same vertical padding and alignment for all tiles
  const pad = "py-16 items-center";
  return (
    <section
      id={id}
      className={`min-h-screen snap-start flex justify-center ${bg} items-center`}
    >
      <div className={`mx-auto max-w-7xl w-full px-6 ${pad} grid ${cols} gap-6`}>
        {/* Use grid order to place viewer and content on correct sides */}
        <div className={`flex justify-center ${viewerOn === 'right' ? 'order-2' : 'order-1'}`}>
          <MediaViewer hero={hero} style={viewerStyle} alt={alt} />
        </div>
  <div className={`flex-1 flex flex-col gap-4 ${viewerOn === 'right' ? 'order-1 ml-8' : 'order-2 mr-8'}`}> 
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
