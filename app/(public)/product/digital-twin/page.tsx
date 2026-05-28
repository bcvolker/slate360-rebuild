import { ProductPageShell } from "@/components/marketing-launchpad/ProductPageShell";

export const metadata = {
  title: "Digital Twin — Slate360",
  description:
    "Immersive 3D spatial environments, panoramic traversal, drone integration, and secure multi-user reality capture for construction teams.",
};

const SECTIONS = [
  {
    title: "Interactive 3D Exploring",
    body: "Use your mouse or touch screen to smoothly orbit and inspect a life-like 3D model of your space. Stakeholders step inside from any web browser without installing software.",
  },
  {
    title: "Mobile to 3D Automation",
    body: "Create realistic, interactive environments by walking through a property with your smartphone camera. Photogrammetry data feeds compile into structural twin models automatically.",
  },
  {
    title: "Drone Scan Integration",
    body: "Pull in high-resolution aerial scans to render exterior overviews and roofs. Combine interior walkthrough data with high-altitude photogrammetry for complete property coverage.",
  },
  {
    title: "360° Panoramic Environments",
    body: "Walk through site histories step-by-step using geolocated panoramic hotspots. Click navigable targets to leap from room to room inside an immersive walkthrough.",
  },
  {
    title: "Before-and-After Timelines",
    body: "Stack historical property scans side-by-side to visually audit changes or check structural progress. Remote owners, architects, and lenders monitor status without leaving the office.",
  },
  {
    title: "Secure Multi-User Access",
    body: "Invite third-party lenders, clients, or remote team members to inspect precise visual histories securely. Digital measurement tools calculate dimensions directly on the virtual canvas.",
  },
] as const;

export default function DigitalTwinProductPage() {
  return (
    <ProductPageShell title="Digital Twin Real-World Simulation">
      <p className="text-lg leading-relaxed text-[#F8FAFC]">
        Generate highly accurate, immersive 3D spatial environments. Slate360 combines smartphone
        walkthrough photogrammetry with drone captures and tripod LiDAR scans to compile comprehensive
        interior and exterior structural twin models.
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
