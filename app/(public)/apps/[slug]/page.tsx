import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Building2,
  Palette,
  FileText,
  Check,
  ArrowRight,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SlateLogo } from "@/components/shared/SlateLogo";

/* ── App data ─────────────────────────────────────────────────── */

interface AppInfo {
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  statusLabel?: string;
  features: { title: string; detail: string }[];
  highlights: string[];
}

const APP_DATA: Record<string, AppInfo> = {
  "site-walk": {
    name: "Site Walk",
    tagline: "Capture context. Create deliverables.",
    description:
      "Capture site conditions in context, document observations as you walk, and turn field documentation into punch lists, branded reports, proposals, and searchable project records.",
    icon: MapPin,
    comingSoon: true,
    statusLabel: "On the Way — Coming Soon",
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
    tagline: "Immersive walkthroughs with project context",
    description:
      "Build immersive 360 walkthroughs with hotspots, floor plans, branded sharing, and client-friendly remote exploration that keeps project context intact.",
    icon: Building2,
    comingSoon: true,
    statusLabel: "Under Development — Coming Soon",
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
    tagline: "Connected 2D and 3D design review",
    description:
      "Review plans, generate and present 3D models, annotate decisions, and move between 2D and 3D design workflows without breaking the client-ready presentation flow.",
    icon: Palette,
    comingSoon: true,
    statusLabel: "Under Development — Coming Soon",
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
  "content-studio": {
    name: "Content Studio",
    tagline: "Branded media and content delivery",
    description:
      "Edit standard and 360 video, organize project media, and produce branded client and marketing deliverables from one connected content workspace.",
    icon: FileText,
    comingSoon: true,
    statusLabel: "Under Development — Coming Soon",
    features: [
      { title: "Asset Library", detail: "Upload and organize photos, videos, PDFs, and documents in a searchable central library." },
      { title: "Collections", detail: "Group assets into themed collections for projects, clients, or milestones." },
      { title: "Client Galleries", detail: "Generate shareable galleries with optional download permissions and password protection." },
      { title: "Bulk Upload", detail: "Drag and drop hundreds of files at once. Auto-tagging keeps everything organized." },
      { title: "Smart Search", detail: "Find any asset instantly with full-text search, tag filters, and date ranges." },
      { title: "Version History", detail: "Track changes to assets over time. Restore previous versions with one click." },
      { title: "Download Controls", detail: "Set per-asset or per-collection download permissions — view-only, download, or full access." },
      { title: "Fast Delivery", detail: "CDN-powered delivery ensures assets load fast for clients anywhere in the world." },
    ],
    highlights: [
      "Works with all common file formats",
      "Integrates with SlateDrop",
      "Pairs with Design Studio in the Studio Bundle",
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
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <SlateLogo />
            </Link>
            <Link
              href="/#apps"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              All Apps
            </Link>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href={app.comingSoon ? "/signup" : "/signup"}>{app.comingSoon ? "Join Waitlist" : "Subscribe Now"}</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{app.name}</h1>
          {app.statusLabel && (
            <span className="inline-block mb-4 rounded-full bg-amber-500/20 px-4 py-1 text-sm font-medium text-amber-400 border border-amber-500/30">
              {app.statusLabel}
            </span>
          )}
          <p className="mb-4 text-xl font-medium text-primary">{app.tagline}</p>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{app.description}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {app.highlights.map((h) => (
              <Badge key={h} variant="outline" className="border-primary/30 bg-primary/5 text-primary">
                {h}
              </Badge>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-4 sm:grid-cols-2 mb-16">
          {app.features.map((f) => (
            <Card key={f.title} className="border-border bg-card/70 transition-colors hover:border-primary/30">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.detail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="border-t border-border py-12 text-center">
          <h2 className="text-2xl font-bold mb-3">
            {app.comingSoon
              ? `${app.name} is coming soon`
              : `Ready to get started with ${app.name}?`}
          </h2>
          <p className="mb-6 text-muted-foreground">
            {app.comingSoon
              ? `Sign up to be notified when ${app.name} launches.`
              : `Subscribe to Slate360 and start using ${app.name} today.`}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" className="bg-primary px-8 text-primary-foreground hover:bg-primary/90">
              <Link href="/signup">
                {app.comingSoon ? "Join Waitlist" : "Subscribe Now"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-border text-muted-foreground hover:border-primary hover:text-primary">
              <Link href="/#apps">View All Apps</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Slate360. All rights reserved.</p>
      </footer>
    </div>
  );
}
