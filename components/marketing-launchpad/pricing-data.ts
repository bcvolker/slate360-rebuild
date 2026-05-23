export type ShowcasePlan = {
  id: string;
  name: string;
  monthly: number;
  annualMonthly: number;
  features: string[];
  button: string;
};

export const SHOWCASE_PLANS: ShowcasePlan[] = [
  {
    id: "site-walk-pro",
    name: "Site Walk Workspace Pro Seat",
    monthly: 130,
    annualMonthly: 108,
    features: [
      "Single-handed mobile photo capture",
      "Geolocated and weather data stamping",
      "Background offline sync queuing",
      "Plan drawing pinning",
      "Direct subcontractor PDF distribution lines",
    ],
    button: "Start Pro Walk Account",
  },
  {
    id: "twin-pro",
    name: "Digital Twin Reality Studio",
    monthly: 199,
    annualMonthly: 166,
    features: [
      "3D property modeling streams from mobile video",
      "Aerial drone scan imports",
      "360° panoramic navigation hotspot traversal",
      "Before-and-after chronological timeline comparisons",
      "Digital coordinate measurement overlay tools",
    ],
    button: "Start Pro Twin Account",
  },
];
