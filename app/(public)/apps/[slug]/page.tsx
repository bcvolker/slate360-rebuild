import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Building2,
  Palette,
  Check,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ── App data ─────────────────────────────────────────────────── */

interface AppInfo {
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  features: { title: string; detail: string }[];
  highlights: string[];
}

const APP_DATA: Record<string, AppInfo> = {
  "site-walk": {
    name: "Site Walk",
    tagline: "Document construction progress like never before",
    description:
      "Capture GPS-tagged photos, generate automated timelines, and share instant progress reports with clients. Site Walk turns every site visit into a structured, searchable record.",
    icon: MapPin,
    features: [
      { title: "GPS-Tagged Capture", detail: "Every photo is automatically tagged with GPS coordinates, date, weather, and orientation." },
      { title: "Automated Timelines", detail: "Progress timelines build themselves as you capture — no manual logging required." },
      { title: "Weather & Date Stamping", detail: "Automatic weather overlay and timestamp on every capture for legal-grade documentation." },
      { title: "One-Click Client Sharing", detail: "Generate a shareable link instantly. Clients see a polished progress report, no login required." },
      { title: "Compare Over Time", detail: "Side-by-side before/after comparisons from the exact same GPS position across visits." },
      { title: "AI Issue Detection", detail: "AI flags potential issues like standing water, missing materials, or safety hazards." },
      { title: "Offline Mode", detail: "Capture in the field without cell service. Everything syncs when you reconnect." },
      { title: "PDF Report Export", detail: "One-click export to branded PDF reports for stakeholder presentations and compliance." },
    ],
    highlights: [
      "First app launching on Slate360",
      "Works on iOS, Android, and web",
      "Integrates with Project Hub",
    ],
  },
  "360-tour-builder": {
    name: "360 Tour Builder",
    tagline: "Create immersive virtual tours in minutes",
    description:
      "Upload 360° photos, add interactive hotspots, and share embeddable tours with clients. No coding required. Tours auto-generate client portals with analytics.",
    icon: Building2,
    features: [
      { title: "Drag-and-Drop Creation", detail: "Upload your 360° photos and arrange scenes visually. Connect them with hotspot links." },
      { title: "Interactive Hotspots", detail: "Add info points, links, images, and video overlays to any position in a 360° scene." },
      { title: "Embed Anywhere", detail: "Embed tours on your website with a single line of code, or share a direct link." },
      { title: "Client Portal Auto-Gen", detail: "Every tour automatically creates a branded client portal with password protection." },
      { title: "Analytics & Tracking", detail: "See who viewed your tour, how long they spent, and which scenes got the most attention." },
      { title: "Floor Plan Integration", detail: "Overlay an interactive floor plan so viewers can jump to any room from a bird's-eye map." },
      { title: "Before / After", detail: "Show progress over time with side-by-side 360° comparisons from the same vantage point." },
      { title: "White-Label Branding", detail: "Replace Slate360 branding with your own logo, colors, and domain for enterprise clients." },
    ],
    highlights: [
      "Used by top construction firms",
      "Unlimited scenes per tour",
      "Downgrade Law protection — links never break",
    ],
  },
  "design-studio": {
    name: "Design Studio",
    tagline: "Bring 3D models to life, share them instantly",
    description:
      "Upload GLB/glTF models, annotate them with markups, and share interactive 3D viewers with clients. No plugins, no downloads — just a link.",
    icon: Palette,
    features: [
      { title: "GLB / glTF Support", detail: "Upload industry-standard 3D model formats directly. No conversion needed." },
      { title: "Interactive Viewer", detail: "Clients can rotate, zoom, and pan your models in their browser — no software required." },
      { title: "Shareable Model Links", detail: "Generate a link to your model with optional password protection and expiry." },
      { title: "Annotation & Markup", detail: "Pin notes, measurements, and comments directly onto the 3D surface." },
      { title: "Before / After", detail: "Compare two model versions side-by-side to show design evolution." },
      { title: "Material Editing", detail: "Swap materials and textures in real-time to explore design options with clients." },
      { title: "Lighting Control", detail: "Adjust scene lighting to preview how models look under different conditions." },
      { title: "Measurement Tools", detail: "Take precise measurements directly on the 3D model surface." },
    ],
    highlights: [
      "Works with Revit, SketchUp, Blender exports",
      "No plugins or downloads needed",
      "Integrates with Project Hub deliverables",
    ],
  },
};

/* ── Page ──────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = APP_DATA[slug];
  if (!app) return { title: "App Not Found — Slate360" };
  return {
    title: `${app.name} — Slate360`,
    description: app.tagline,
  };
}

export default async function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = APP_DATA[slug];
  if (!app) notFound();

  const Icon = app.icon;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
        <div className="container mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <img src="/uploads/SLATE 360-Color Reversed Lockup.svg" alt="Slate360" className="h-7 w-auto" />
            </Link>
            <Link
              href="/#apps"
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-[#D4AF37] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All Apps
            </Link>
          </div>
          <Button asChild className="bg-[#D4AF37] text-zinc-950 hover:bg-[#D4AF37]/90">
            <Link href="/signup">Subscribe Now</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-[#D4AF37]/20 mb-6">
            <Icon className="h-8 w-8 text-[#D4AF37]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{app.name}</h1>
          <p className="text-xl text-[#D4AF37] font-medium mb-4">{app.tagline}</p>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">{app.description}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {app.highlights.map((h) => (
              <Badge key={h} variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37]">
                {h}
              </Badge>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-4 sm:grid-cols-2 mb-16">
          {app.features.map((f) => (
            <Card key={f.title} className="bg-zinc-900/50 border-zinc-800 hover:border-[#D4AF37]/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-[#D4AF37]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                    <p className="text-sm text-zinc-400">{f.detail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center py-12 border-t border-zinc-800">
          <h2 className="text-2xl font-bold mb-3">Ready to get started with {app.name}?</h2>
          <p className="text-zinc-400 mb-6">
            Subscribe to Slate360 and start using {app.name} today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" className="bg-[#D4AF37] text-zinc-950 hover:bg-[#D4AF37]/90 px-8">
              <Link href="/signup">
                Subscribe Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-zinc-700 text-zinc-300 hover:border-[#D4AF37] hover:text-[#D4AF37]">
              <Link href="/#apps">View All Apps</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
        <p>&copy; {new Date().getFullYear()} Slate360. All rights reserved.</p>
      </footer>
    </div>
  );
}
