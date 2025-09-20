import MediaViewer from "./MediaViewer";
import Link from "next/link";

type Props = { id: string; title: string; subtitle?: string; description: string; features: string[]; learnHref: string; viewerOn?: "left" | "right"; alt?: boolean; hero?: boolean };

export default function TileSection({ id, title, subtitle, description, features, learnHref, viewerOn = "right", alt = false, hero = false }: Props) {
  const bg = alt ? "bg-[var(--surface-light)]" : "bg-[var(--surface-dark)]";
  const cols = viewerOn === "left" ? "md:grid-cols-[auto,1fr]" : "md:grid-cols-[1fr,auto]";
  return (
    <section id={id} className="min-h-screen snap-start flex items-center justify-center">
      <div className={`mx-auto max-w-7xl w-full px-6 py-16 grid ${cols} gap-6 items-start ${bg} text-white`}>
        <div className="flex justify-center">
          <MediaViewer hero={hero} />
        </div>
        <div className="flex flex-col gap-4">
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
