import {
  MapPin,
  Building2,
  Sparkles,
  Users,
  Camera,
  Clock,
  Shield,
  type LucideIcon,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

export type DemoType = "video" | "360" | "3d";

export interface AppItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  demoType: DemoType;
  demoUrl: string;
  demoPoster?: string;
}

export interface StatItem {
  value: string;
  label: string;
  icon: LucideIcon;
}

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  company: string;
  avatar: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// DATA
// ──────────────────────────────────────────────────────────────────────────────

export const APPS: AppItem[] = [
  {
    id: "site-walk",
    name: "Site Walk",
    tagline: "Document Progress with Precision",
    description:
      "Capture GPS-tagged photos and videos during site walks. Automatically organize by location and timestamp for seamless progress tracking and client updates.",
    icon: MapPin,
    features: [
      "GPS-tagged photo capture",
      "Automatic timeline organization",
      "Weather & timestamp metadata",
      "Instant sharing with stakeholders",
    ],
    demoType: "video",
    demoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    demoPoster:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
  },
  {
    id: "360-tours",
    name: "360 Tours",
    tagline: "Immersive Virtual Experiences",
    description:
      "Create stunning 360° virtual tours with interactive hotspots. Let clients explore projects remotely with the same detail as an in-person walkthrough.",
    icon: Building2,
    features: [
      "360° panoramic capture",
      "Interactive hotspot navigation",
      "Floor plan integration",
      "Embed anywhere",
    ],
    demoType: "360",
    demoUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80",
  },
  {
    id: "design-studio",
    name: "Design Studio",
    tagline: "Professional Visual Editing",
    description:
      "Transform raw captures into polished deliverables. Add annotations, measurements, comparisons, and branded overlays for professional presentations.",
    icon: Sparkles,
    features: [
      "Before/after comparisons",
      "Measurement annotations",
      "Brand customization",
      "Export in multiple formats",
    ],
    demoType: "3d",
    demoUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
  },
];

export const STATS: StatItem[] = [
  { value: "500+", label: "Construction Teams", icon: Users },
  { value: "2M+", label: "Photos Captured", icon: Camera },
  { value: "50%", label: "Time Saved", icon: Clock },
  { value: "99.9%", label: "Uptime", icon: Shield },
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    quote:
      "Slate360 transformed how we document our projects. Clients love the virtual tours and our team saves hours every week.",
    author: "Sarah Chen",
    role: "Project Manager",
    company: "BuildRight Construction",
    avatar: "SC",
  },
  {
    quote:
      "The GPS-tagged progress photos have eliminated disputes about timeline and work completion. Worth every penny.",
    author: "Marcus Johnson",
    role: "Site Superintendent",
    company: "Apex Builders",
    avatar: "MJ",
  },
  {
    quote:
      "We\u2019ve reduced site visits by 40% thanks to the 360 Tours. Our remote stakeholders feel like they\u2019re actually there.",
    author: "Elena Rodriguez",
    role: "Operations Director",
    company: "Metro Development",
    avatar: "ER",
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Site Walk Basic",
    price: "$79",
    period: "/mo",
    description: "Field documentation essentials",
    features: [
      "5 GB cloud storage",
      "200 processing credits/mo",
      "2 seats",
      "SlateDrop file management",
      "Share links for clients",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Field Pro Bundle",
    price: "$149",
    period: "/mo",
    description: "Site Walk Pro + 360 Tours Pro",
    features: [
      "30 GB cloud storage",
      "1,000 credits/mo",
      "5 seats + team management",
      "Full cross-app synergy",
      "Priority processing",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "All Access",
    price: "$249",
    period: "/mo",
    description: "Every app at Pro tier",
    features: [
      "75 GB storage",
      "2,500 credits/mo",
      "10 seats + team management",
      "Every current and future app",
      "Priority support",
    ],
    cta: "Get Started",
    popular: false,
  },
];

export const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Site Walk", href: "/site-walk" },
    { label: "SlateDrop", href: "/slatedrop" },
    { label: "Pricing", href: "/plans" },
  ],
  Resources: [
    { label: "Documentation", href: "mailto:hello@slate360.ai?subject=Documentation" },
    { label: "Contact", href: "mailto:hello@slate360.ai" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};
