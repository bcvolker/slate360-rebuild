export type MarketingTile = {
  id?: string;
  title: string;
  description: string;
  features: string[];
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
    "Single-handed field tracking with predictive tag classification",
    "Instant document deliverable field report compilation",
    "Automated geolocated and weather data stamping on every capture",
    "Background offline sync queuing for disconnected job sites",
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
    "Interactive pin mapping on blueprint drawing sheets",
    "Ghost layer overlays aligned to prior capture angles",
    "Panoramic 360° support from mobile device memory",
    "Secure data exports via email or web link",
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
    "Interactive 3D structural environment exploring",
    "Mobile walkthrough to 3D model automation",
    "Aerial drone scan integration for exterior coverage",
    "Browser-based access with zero client installation",
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
    "Fluid 360° room-to-room panoramic traversal",
    "Before-and-after chronological timeline comparisons",
    "Digital coordinate measurement overlay tools",
    "Secure multi-user access for clients and lenders",
  ],
  ctaLabel: "Explore Reality Capture →",
  ctaHref: "/product/digital-twin",
  media: "panorama",
  reversed: true,
};
