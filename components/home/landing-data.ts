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

// Pricing data lives in components/home/pricing-data.ts (and the
// pricing/ subfolder). It is intentionally NOT re-exported here so the
// public homepage has a single canonical source for SKU numbers.

// ──────────────────────────────────────────────────────────────────────────────
// DATA
// ──────────────────────────────────────────────────────────────────────────────

export const APPS: AppItem[] = [
  {
    id: "site-walk",
    name: "Site Walk",
    tagline: "Walk the project. Capture everything.",
    description:
      "Walk a job with your phone or tablet to capture conditions, photos, notes, and tagged fields as you go — then turn what you saw into punch lists, branded reports, and proposals without retyping a thing.",
    icon: MapPin,
    features: [
      "Take photos and notes as you walk the job — no clipboard, no retyping later",
      "Every photo automatically tagged with where it was taken, when, and the weather",
      "Speak instead of type — voice notes are transcribed for you",
      "Mark up photos with arrows, circles, and callouts to point out exactly what matters",
      "Drop photos onto floor plans so anyone can see what you saw and where",
      "Turn a finished walk into a punch list, branded report, or proposal in one tap",
      "Send to clients, owners, or trades by email or share link — no app required to view",
      "Works offline on the job site and syncs as soon as you're back on signal",
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
    tagline: "Immersive walkthroughs with project context",
    description:
      "Create immersive 360 walkthroughs with hotspots, floor plans, and branded sharing so clients and stakeholders can explore remotely with context.",
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
    tagline: "Connected 2D and 3D design review",
    description:
      "Review plans, generate and present 3D models, and move through design decisions in connected 2D and 3D workspaces.",
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
      "The geolocated, time-stamped progress photos have eliminated disputes about timeline and work completion. Worth every penny.",
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
