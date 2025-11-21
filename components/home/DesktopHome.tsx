import TileSection from "@/components/ui/TileSection";

const tiles = [
  { id: "slate360", eyebrow: "From Design to Reality", title: "Your vision, instantly realized.", subtitle: "Slate360 unifies BIM, 360 tours, analytics, VR, and geospatial tools into one command center for the built environment.", bullets: ["Access every workflow in one secure hub.", "Connect office and field teams in real time.", "Forecast risk, cost, and performance with AI.", "Plug into the tools and data you already use."], ctaLabel: "Request a demo", ctaHref: "#contact", viewerTitle: "Slate360 Viewer", viewerSubtitle: "Interactive tools and digital twins coming soon." },
  { id: "design-studio", eyebrow: "Placeholder 2", title: "Design Studio", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "project-hub", eyebrow: "Placeholder 3", title: "Project Hub", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "content-studio", eyebrow: "Placeholder 4", title: "Content Studio", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "tour-builder", eyebrow: "Placeholder 5", title: "360 Tour Builder", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "geospatial", eyebrow: "Placeholder 6", title: "Geospatial & Robotics", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "virtual-studio", eyebrow: "Placeholder 7", title: "Virtual Studio", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" },
  { id: "analytics", eyebrow: "Placeholder 8", title: "Analytics & Reports", subtitle: "This is a placeholder for the next section.", bullets: ["Placeholder bullet 1"], ctaLabel: "Learn More", ctaHref: "#", viewerTitle: "Placeholder Viewer" }
];

export default function DesktopHome() {
  return (
    <>
      {tiles.map((tile, index) => (
        <TileSection key={tile.id} tile={tile} index={index} />
      ))}
    </>
  );
}
