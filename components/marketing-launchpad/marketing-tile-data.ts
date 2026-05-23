export type FeaturePoint = { icon: string; title: string; body: string };

export type MarketingTile = {
  id?: string;
  title: string;
  description: string;
  features: FeaturePoint[];
  ctaLabel: string;
  ctaHref: string;
  media: "hero-model" | "capture" | "maps" | "twin" | "panorama";
  reversed?: boolean;
};

export const SITE_WALK_CAPTURE_TILE: MarketingTile = {
  id: "site-walk-section-start",
  title: "Site Walk Field Engine",
  description:
    "Stop filling your device camera roll with uncontextualized field pictures. Walk the project site using your smartphone or tablet to capture conditions seamlessly in real-time. Every photo is automatically bound to its project location context, timestamped, and geolocated instantly.",
  features: [
    { icon: "📱", title: "Smart Mobile Capture", body: "Walk through any space with your phone or tablet to document exactly what it looks like." },
    { icon: "📝", title: "Instant Organized Notes", body: "Type notes right alongside your photos so you never forget the details." },
    { icon: "📋", title: "One-Click Visual Reports", body: "Instantly turn your photo walk into a beautifully polished document to share with your team or clients." },
    { icon: "🚫", title: "Zero Photo Clutter", body: "Keep your personal phone camera roll completely empty—all project photos stay safely organized inside the app." },
  ],
  ctaLabel: "Learn More About Site Walk →",
  ctaHref: "/product/site-walk",
  media: "capture",
};

export const SITE_WALK_MAPS_TILE: MarketingTile = {
  title: "Precision Plan Pinning",
  description:
    "Link your visual data directly to your structural coordinates. Long-press any set of drawings or floor plan sheets inside the mobile app to drop high-visibility interactive tracking pins. Attach standard progress photos or select raw 360° equirectangular panoramas directly from your local phone memory to preserve total field context.",
  features: [
    { icon: "🗺️", title: "Interactive Pin Mapping", body: "Tap on a map or drawing sheet to drop a pin exactly where your photo was taken." },
    { icon: "👻", title: "Ghost Layer Overlays", body: "See a transparent ghost view of a past photo right on your live screen, allowing you to perfectly line up a new shot from the exact same angle to see changes over time." },
    { icon: "🔄", title: "Panoramic 360° Photo Support", body: "Seamlessly upload immersive 360° panoramas directly from your phone's memory to view a complete room at once." },
    { icon: "📥", title: "Easy Data Exports", body: "Share your mapped-out visual timelines cleanly via email or web link with absolute structural security." },
  ],
  ctaLabel: "Explore Plan Workflows →",
  ctaHref: "/product/site-walk",
  media: "maps",
  reversed: true,
};

export const DIGITAL_TWIN_TILE: MarketingTile = {
  title: "Digital Twin Real-World Simulation",
  description:
    "Generate highly accurate, immersive 3D spatial environments. By combining smartphone walkthrough photogrammetry data feeds with high-altitude drone photogrammetry and tripod LiDAR laser scans, Slate360 compiles comprehensive interior and exterior structural twin models automatically.",
  features: [
    { icon: "🏗️", title: "Interactive 3D Exploring", body: "Use your mouse or touch screen to smoothly orbit and inspect a life-like 3D model of your space." },
    { icon: "📹", title: "Mobile to 3D Automation", body: "Create realistic, interactive environments simply by walking through a property with your smartphone camera." },
    { icon: "✈️", title: "Drone Scan Integration", body: "Pull in high-resolution aerial scans to render flawless exterior overviews and roofs." },
    { icon: "💻", title: "Zero Installation Needed", body: "Your clients and stakeholders can click a link and step inside the 3D space instantly from any web browser." },
  ],
  ctaLabel: "Learn More About Twins →",
  ctaHref: "/product/digital-twin",
  media: "twin",
};

export const PANORAMA_TILE: MarketingTile = {
  title: "360° Panoramic Environments",
  description:
    "Explore internal building envelopes with absolute spatial continuity. Walk through site histories step-by-step using geolocated panoramic hotspots, allowing owners, architects, and lenders to monitor physical status updates remotely without leaving the office workspace.",
  features: [
    { icon: "🔄", title: "Fluid 360° Traversal", body: "Click navigable target hotspots to smoothly leap from room to room inside a panoramic walkthrough." },
    { icon: "🔀", title: "Before-and-After Timelines", body: "Stack historical property scans side-by-side to visually audit changes or check structural progress." },
    { icon: "📐", title: "Digital Measurement Tools", body: "Calculate heights, widths, and clearance dimensions directly on the virtual 3D canvas model." },
    { icon: "🔒", title: "Secure Multi-User Access", body: "Easily invite third-party lenders, clients, or remote team members to inspect precise visual histories securely." },
  ],
  ctaLabel: "Explore Reality Capture →",
  ctaHref: "/product/digital-twin",
  media: "panorama",
  reversed: true,
};
