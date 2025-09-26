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
  const isReverse = viewerOn === "left";
  
  return (
    <section 
      id={id} 
      className={`w-full h-screen snap-start flex ${
        isReverse ? "md:flex-row-reverse" : "md:flex-row"
      } flex-col items-center justify-center bg-white border-b border-[#B87333]/20 scroll-mt-20`}
    >
      {/* Viewer Section */}
      <div className={`${
        hero ? "md:w-[55%] h-[75%]" : "md:w-[45%] h-[70%]"
      } w-full flex items-center justify-center p-4`}>
        <div className="w-full h-full rounded-lg shadow-lg overflow-hidden border border-slate-200">
          <MediaViewer id={id} title={title} />
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 h-full flex flex-col justify-center p-8 space-y-6">
        <h2 className="text-5xl font-bold text-gray-900">{title}</h2>
        {subtitle && (
          <h3 className="text-2xl font-semibold text-[#4B9CD3]">{subtitle}</h3>
        )}
        <p className="text-xl text-gray-700 leading-relaxed max-w-2xl">{description}</p>
        
        {features && features.length > 0 && (
          <ul className="space-y-3">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-[#B87333] text-lg mt-1">▸</span>
                <span className="text-lg text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        )}
        
        <Link
          href={learnHref}
          className="inline-flex items-center gap-2 bg-[#B87333] text-white px-6 py-3 rounded-md font-semibold hover:bg-[#9f5f24] transition-colors shadow-lg"
        >
          Learn More →
        </Link>
      </div>
    </section>
  );
}
