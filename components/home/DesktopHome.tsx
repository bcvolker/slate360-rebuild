import TileSection from "@/components/ui/TileSection";

const tiles = [
  { id: "slate360", eyebrow: "From Design to Reality", title: "Your vision, instantly realized.", subtitle: "Slate360 unifies BIM, 360 tours, analytics, VR, and geospatial tools into one command center for the built environment.", bullets: ["Access every workflow in one secure hub.", "Connect office and field teams in real time.", "Forecast risk, cost, and performance with AI.", "Plug into the tools and data you already use."], ctaLabel: "Request a demo", ctaHref: "#contact", viewerTitle: "Slate360 Viewer", viewerSubtitle: "Interactive tools and digital twins coming soon." },
  { id: "bim-studio", eyebrow: "Placeholder 2", title: "BIM Studio", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "project-hub", eyebrow: "Placeholder 3", title: "Project Hub", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "content-studio", eyebrow: "Placeholder 4", title: "Content Studio", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "tour-builder", eyebrow: "Placeholder 5", title: "360 Tour Builder", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id:"geospatial", eyebrow: "Placeholder 6", title: "Geospatial", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "vr-lab", eyebrow: "Placeholder 7", title: "VR Lab", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "analytics", eyebrow: "Placeholder 8", title: "Analytics", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" }
];

export default function DesktopHome() {
  return (
    <>
      {tiles.map((tile, index) => (
        <div key={tile.id} className="last:pb-24">
          <div className="w-full h-full">
            <TileSection tile={tile} index={index} />
          </div>
        </div>
      ))}
    </>
  );
}
