import { MapPin, Building2, Sparkles, Users, Camera, Clock, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
    demoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    demoPoster: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
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
    demoUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80",
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
    demoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80",
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
      "We've reduced site visits by 40% thanks to the 360 Tours. Our remote stakeholders feel like they're actually there.",
    author: "Elena Rodriguez",
    role: "Operations Director",
    company: "Metro Development",
    avatar: "ER",
  },
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "Perfect for small teams getting started",
    features: [
      "1 active project",
      "Site Walk app included",
      "5 GB storage",
      "Basic support",
      "Export to PDF",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    price: "$149",
    period: "/month",
    description: "For growing teams with multiple projects",
    features: [
      "10 active projects",
      "All 3 apps included",
      "50 GB storage",
      "Priority support",
      "Custom branding",
      "API access",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with custom needs",
    features: [
      "Unlimited projects",
      "All apps + custom features",
      "Unlimited storage",
      "Dedicated support",
      "SSO & advanced security",
      "On-premise option",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export const FOOTER_LINKS: Record<string, string[]> = {
  Product: ["Site Walk", "360 Tours", "Design Studio", "Pricing", "Integrations"],
  Resources: ["Documentation", "API Reference", "Tutorials", "Blog", "Case Studies"],
  Company: ["About Us", "Careers", "Press", "Contact", "Partners"],
  Legal: ["Privacy Policy", "Terms of Service", "Security", "GDPR"],
};
