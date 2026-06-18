import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Check,
  ArrowRight,
  ArrowLeft,
  FolderSync,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SlateLogo } from "@/components/shared/SlateLogo";

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
    tagline: "Capture context. Create deliverables.",
    description:
      "Walk the project with your phone or tablet, document observations in context, and turn field capture into punch lists, branded reports, and shareable deliverables — without rebuilding the story back at the office.",
    icon: MapPin,
    features: [
      { title: "Contextual capture", detail: "Photos, voice, and notes stay tied to project location, time, and plan context." },
      { title: "Plan-aware documentation", detail: "Drop captures onto floor plans so reviewers see what you saw and where." },
      { title: "Branded outputs", detail: "Turn a finished walk into client-ready PDFs and share links with your branding." },
      { title: "Field and office alignment", detail: "The same record supports supers in the field and coordinators in the office." },
      { title: "Offline on site", detail: "Capture without signal; sync when connectivity returns." },
      { title: "Secure sharing", detail: "Share deliverables with stakeholders who do not need a full account." },
    ],
    highlights: [
      "First app in the Slate360 Foundational Release",
      "Built for iOS, Android, and web",
      "Connected to project hub and SlateDrop",
    ],
  },
};

const PLATFORM_SLUGS = new Set(["slatedrop", "coordination"]);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = APP_DATA[slug];
  if (!app) return { title: "Not Found — Slate360" };
  return {
    title: `${app.name} — Slate360`,
    description: app.tagline,
  };
}

export default async function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (PLATFORM_SLUGS.has(slug)) {
    notFound();
  }

  const app = APP_DATA[slug];
  if (!app) notFound();

  const Icon = app.icon;

  return (
    <div className="dark min-h-screen bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]">
      <header className="sticky top-0 z-50 h-16 border-b border-white/10 bg-[var(--graphite-canvas)]/90 backdrop-blur-xl">
        <div className="container mx-auto flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <SlateLogo />
            </Link>
            <Link
              href="/#product"
              className="flex items-center gap-1 text-sm text-[var(--graphite-muted)] transition-colors hover:text-[var(--graphite-text-header)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>
          <Button asChild className="bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] hover:opacity-90">
            <Link href="/signup">Request access</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-16">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--graphite-primary)_15%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--graphite-primary)_25%,transparent)]">
            <Icon className="h-8 w-8 text-[var(--graphite-primary)]" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-[var(--graphite-text-header)] sm:text-5xl">{app.name}</h1>
          <span className="mb-4 inline-block rounded-lg border border-[color-mix(in_srgb,var(--graphite-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] px-4 py-1 text-sm font-medium text-[var(--graphite-primary)]">
            Foundational Release
          </span>
          <p className="mb-4 text-xl font-medium text-[var(--graphite-primary)]">{app.tagline}</p>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--graphite-muted)]">{app.description}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {app.highlights.map((h) => (
              <span
                key={h}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-[var(--graphite-text-body)]"
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-16 grid gap-4 sm:grid-cols-2">
          {app.features.map((f) => (
            <Card key={f.title} className="border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_25%,transparent)]">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)]">
                    <Check className="h-3 w-3 text-[var(--graphite-primary)]" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-[var(--graphite-text-header)]">{f.title}</h3>
                    <p className="text-sm text-[var(--graphite-muted)]">{f.detail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] p-8 text-center backdrop-blur-md">
          <h2 className="mb-3 text-2xl font-bold text-[var(--graphite-text-header)]">Request Foundational Release access</h2>
          <p className="mb-6 text-[var(--graphite-muted)]">
            Create an account, confirm your email, and the Slate360 team will review your request before workspace access is granted.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-[var(--graphite-primary)] px-8 text-[var(--graphite-canvas)] hover:opacity-90">
              <Link href="/signup">
                Create account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/15 text-[var(--graphite-text-body)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] hover:text-[var(--graphite-primary)]">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <Card className="border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)]">
            <CardContent className="flex gap-4 p-6">
              <FolderSync className="h-8 w-8 shrink-0 text-[var(--graphite-primary)]" />
              <div>
                <h3 className="font-semibold text-[var(--graphite-text-header)]">SlateDrop</h3>
                <p className="mt-1 text-sm text-[var(--graphite-muted)]">
                  Shared file delivery and project storage that keeps deliverables tied to the right job.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)]">
            <CardContent className="flex gap-4 p-6">
              <Users className="h-8 w-8 shrink-0 text-[var(--graphite-primary)]" />
              <div>
                <h3 className="font-semibold text-[var(--graphite-text-header)]">Coordination</h3>
                <p className="mt-1 text-sm text-[var(--graphite-muted)]">
                  Contacts, permissions, and project context so field capture and office review stay aligned.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-[var(--graphite-muted)]">
        <p>&copy; {new Date().getFullYear()} Slate360. All rights reserved.</p>
      </footer>
    </div>
  );
}
