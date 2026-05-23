import { ProductPageShell } from "@/components/marketing-launchpad/ProductPageShell";

export const metadata = {
  title: "Site Walk — Slate360",
  description:
    "Mobile field capture, plan pinning, ghost overlays, and one-click visual reports for construction site documentation.",
};

const SECTIONS = [
  {
    title: "Smart Mobile Capture",
    body: "Walk through any space with your phone or tablet to document exactly what it looks like. Every photo is automatically bound to project location context, timestamped, and geolocated.",
  },
  {
    title: "Instant Organized Notes",
    body: "Type notes right alongside your photos so you never forget the details. Field observations stay attached to the exact visual record they describe.",
  },
  {
    title: "Interactive Pin Mapping",
    body: "Long-press drawings or floor plan sheets to drop high-visibility tracking pins. Tap a map or sheet to mark exactly where each photo was taken.",
  },
  {
    title: "Ghost Layer Overlays",
    body: "See a transparent ghost view of a past photo on your live screen. Line up a new shot from the exact same angle to compare changes over time.",
  },
  {
    title: "One-Click Visual Reports",
    body: "Turn a photo walk into a polished document to share with your team or clients. Automated PDF reporting loops keep deliverables moving without manual assembly.",
  },
  {
    title: "Zero Photo Clutter",
    body: "Keep your personal camera roll empty—all project photos stay safely organized inside the app with secure export when you need to share.",
  },
] as const;

export default function SiteWalkProductPage() {
  return (
    <ProductPageShell title="Site Walk Field Engine">
      <p className="text-lg leading-relaxed text-[#F8FAFC]">
        Stop filling your device camera roll with uncontextualized field pictures. Site Walk is Slate360&apos;s
        mobile-first engine for walking a project site, capturing conditions in real time, and turning visual
        data into organized, shareable reports.
      </p>
      {SECTIONS.map((section) => (
        <article
          key={section.title}
          className="rounded-xl border border-white/[0.08] bg-slate-900/40 p-6"
        >
          <h2 className="text-xl font-bold text-[#FFFFFF]">{section.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[#A3AED0]">{section.body}</p>
        </article>
      ))}
    </ProductPageShell>
  );
}
