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
    tagline: "Capture context. Create deliverables.",
    description:
      "Capture site conditions, document observations in context, and turn field documentation into punch lists, branded reports, and proposal-ready deliverables.",
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
    description: "Solo field documentation",
    features: [
      "Capture: photos, voice notes, GPS, weather",
      "AI-formatted deliverables (PDF + share link)",
      "5 GB storage",
      "200 processing credits / mo",
      "1 seat (solo use)",
      "SlateDrop Basic included",
    ],
    cta: "Start Site Walk",
    popular: false,
  },
  {
    name: "Site Walk Pro",
    price: "$129",
    period: "/mo",
    description: "Field teams + collaboration",
    features: [
      "Everything in Basic",
      "Up to 3 collaborators per subscriber",
      "Project-bound mode + leadership view",
      "Branded deliverables (logo, colors, signature)",
      "Inline-image + hosted-viewer share channels",
      "15 GB storage · 500 credits / mo",
    ],
    cta: "Start Site Walk Pro",
    popular: false,
  },
  {
    name: "Field Pro Bundle",
    price: "$149",
    period: "/mo",
    description: "Site Walk Pro + 360 Tours Pro",
    features: [
      "Everything in Site Walk Pro",
      "360 Tours Pro: navigable scenes pinned to findings",
      "Cross-app: open issues directly inside immersive context",
      "30 GB storage · 1,000 credits / mo",
      "5 collaborator seats",
      "Priority processing queue",
    ],
    cta: "Get Field Pro",
    popular: true,
  },
  {
    name: "All Access",
    price: "$249",
    period: "/mo",
    description: "Every Slate360 app at Pro tier",
    features: [
      "Site Walk Pro · 360 Tours Pro · Design Studio Pro · Content Studio Pro",
      "SlateDrop Pro file management + advanced shares",
      "75 GB storage · 2,500 credits / mo",
      "10 collaborator seats + team management",
      "Every current and future app at Pro tier",
      "Priority support",
    ],
    cta: "Get All Access",
    popular: false,
  },
];

/**
 * Standalone per-app prices (rendered below the bundle grid). Each app can be
 * subscribed to individually at Basic or Pro tier.
 */
export interface StandaloneAppPrice {
  name: string;
  basic: string;
  pro: string;
  summary: string;
}

export const STANDALONE_APP_PRICES: StandaloneAppPrice[] = [
  { name: "Site Walk",       basic: "$79",  pro: "$129", summary: "Capture → AI deliverables → multi-channel share" },
  { name: "360 Tours",       basic: "$49",  pro: "$99",  summary: "Navigable 360 scenes, pin issues in immersive context" },
  { name: "Design Studio",   basic: "$49",  pro: "$99",  summary: "3D model upload, viewing, and design context" },
  { name: "Content Studio",  basic: "$49",  pro: "$99",  summary: "Media upload, editing, and content packaging" },
  { name: "SlateDrop",       basic: "Free", pro: "$39",  summary: "File management — Basic included with any paid app" },
];

/** Storage and credit add-ons (a la carte). */
export interface AddOnPrice {
  label: string;
  price: string;
  detail: string;
}

export const STORAGE_ADDONS: AddOnPrice[] = [
  { label: "+10 GB storage",   price: "$9 / mo",  detail: "Top up any plan" },
  { label: "+50 GB storage",   price: "$29 / mo", detail: "Best value per GB" },
];

export const CREDIT_PACKS: AddOnPrice[] = [
  { label: "500 credits",   price: "$19 one-time", detail: "Top up processing" },
  { label: "2,000 credits", price: "$49 one-time", detail: "Most popular" },
  { label: "5,000 credits", price: "$99 one-time", detail: "Heavy use" },
];

/** Industry-standard usage disclaimer for the pricing section. */
export const PRICING_DISCLAIMER =
  "Plans include a monthly allotment of processing credits and storage shown above. " +
  "Heavy back-end usage — large media uploads, AI deliverable generation beyond the included credits, " +
  "extended hosted share-link retention, and overage storage — may incur additional usage-based charges " +
  "billed against your account. You'll always see usage in your billing dashboard before any overage applies, " +
  "and you can cap or disable overages at any time. Prices are USD and exclude applicable taxes.";

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
