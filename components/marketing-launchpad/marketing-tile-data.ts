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
  id: "site-walk-start",
  title: "Site Walk Field Engine",
  description:
    "Stop filling your device camera roll with uncontextualized field pictures. Walk the project site using your smartphone or tablet to capture conditions seamlessly in real-time. Every photo is automatically bound to its project location context, timestamped, and geolocated instantly.",
  features: [
    { icon: "📱", title: "Smart Mobile Capture", body: "Document any space with your phone or tablet as you walk." },
    { icon: "📝", title: "Instant Organized Notes", body: "Attach notes beside every photo so details never get lost." },
    { icon: "📋", title: "One-Click Visual Reports", body: "Turn a walk into a polished shareable document instantly." },
    { icon: "🚫", title: "Zero Photo Clutter", body: "Keep project photos organized inside the app, not your camera roll." },
  ],
  ctaLabel: "Learn More About Site Walk →",
  ctaHref: "/product/site-walk",
  media: "capture",
};

export const SITE_WALK_MAPS_TILE: MarketingTile = {
  title: "Precision Plan Pinning",
  description:
    "Link your visual data directly to your structural coordinates. Long-press any set of drawings or floor plan sheets inside the mobile app to drop high-visibility interactive tracking pins.",
  features: [
    { icon: "🗺️", title: "Interactive Pin Mapping", body: "Drop a pin exactly where each photo was taken on a plan sheet." },
    { icon: "👻", title: "Ghost Layer Overlays", body: "Line up new shots from the exact same angle as past captures." },
    { icon: "🔄", title: "Panoramic 360° Support", body: "Upload immersive panoramas directly from your phone memory." },
    { icon: "📥", title: "Easy Data Exports", body: "Share mapped visual timelines via email or secure web link." },
  ],
  ctaLabel: "Explore Plan Workflows →",
  ctaHref: "/product/site-walk",
  media: "maps",
  reversed: true,
};

export const DIGITAL_TWIN_TILE: MarketingTile = {
  id: "digital-twin-start",
  title: "Digital Twin Real-World Simulation",
  description:
    "Generate highly accurate, immersive 3D spatial environments. Slate360 compiles comprehensive interior and exterior structural twin models from mobile walkthroughs, drone scans, and LiDAR feeds.",
  features: [
    { icon: "🏗️", title: "Interactive 3D Exploring", body: "Orbit and inspect a life-like 3D model with touch or mouse." },
    { icon: "📹", title: "Mobile to 3D Automation", body: "Build interactive environments by walking through with your phone." },
    { icon: "✈️", title: "Drone Scan Integration", body: "Import aerial scans for exterior overviews and roof coverage." },
    { icon: "💻", title: "Zero Installation Needed", body: "Stakeholders step inside from any web browser via a link." },
  ],
  ctaLabel: "Learn More About Twins →",
  ctaHref: "/product/digital-twin",
  media: "twin",
};

export const PANORAMA_TILE: MarketingTile = {
  title: "360° Panoramic Environments",
  description:
    "Explore internal building envelopes with absolute spatial continuity. Walk through site histories using geolocated panoramic hotspots so remote teams can monitor status without leaving the office.",
  features: [
    { icon: "🔄", title: "Fluid 360° Traversal", body: "Leap room to room inside a panoramic walkthrough." },
    { icon: "🔀", title: "Before-and-After Timelines", body: "Stack historical scans to audit changes over time." },
    { icon: "📐", title: "Digital Measurement Tools", body: "Calculate dimensions directly on the virtual canvas." },
    { icon: "🔒", title: "Secure Multi-User Access", body: "Invite clients and lenders to inspect visual histories securely." },
  ],
  ctaLabel: "Explore Reality Capture →",
  ctaHref: "/product/digital-twin",
  media: "panorama",
  reversed: true,
};
