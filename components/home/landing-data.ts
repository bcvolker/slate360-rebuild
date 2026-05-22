import {
  MapPin,
  FolderSync,
  Users,
  Camera,
  Clock,
  Shield,
  type LucideIcon,
} from "lucide-react";

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

/** Public marketing: Site Walk is the only featured app. */
export const APPS: AppItem[] = [
  {
    id: "site-walk",
    name: "Site Walk",
    tagline: "Walk the project. Capture everything.",
    description:
      "Walk a job with your phone or tablet to capture conditions, photos, notes, and tagged fields as you go — then turn what you saw into punch lists, branded reports, and proposals without retyping a thing.",
    icon: MapPin,
    features: [
      "Take photos and notes as you walk the job",
      "Every capture tied to location, time, and plan context",
      "Voice notes transcribed for faster documentation",
      "Mark up photos to show exactly what matters",
      "Drop captures onto floor plans for reviewers",
      "Turn a walk into punch lists and branded reports",
      "Share deliverables by email or secure link",
      "Works offline on site; syncs when you reconnect",
    ],
    demoType: "video",
    demoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    demoPoster:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
  },
];

export const PLATFORM_HIGHLIGHTS = [
  {
    id: "slatedrop",
    name: "SlateDrop",
    tagline: "Secure file delivery tied to projects",
    icon: FolderSync,
  },
  {
    id: "coordination",
    name: "Coordination",
    tagline: "Contacts and permissions across teams",
    icon: Users,
  },
];

/** Non-numeric trust signals — no fabricated usage stats. */
export const STATS: StatItem[] = [
  { value: "Field", label: "Capture on site", icon: Camera },
  { value: "Office", label: "Review with context", icon: Users },
  { value: "Minutes", label: "To branded outputs", icon: Clock },
  { value: "Secure", label: "Sharing controls", icon: Shield },
];

export const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Site Walk", href: "/apps/site-walk" },
    { label: "Install", href: "/install" },
    { label: "Request access", href: "/signup" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};

export const TESTIMONIALS: TestimonialItem[] = [
  {
    quote:
      "We are onboarding founding teams to Site Walk first — their stories will appear here as the Foundational Release grows.",
    author: "Slate360",
    role: "Founding teams",
    company: "Early access",
    avatar: "",
  },
];
