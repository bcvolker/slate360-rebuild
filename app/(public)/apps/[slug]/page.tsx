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
    <div className="dark min-h-screen bg-[#0B0F15] text-slate-200">
      <header className="sticky top-0 z-50 h-16 border-b border-white/10 bg-[#0B0F15]/90 backdrop-blur-xl">
        <div className="container mx-auto flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center">
              <SlateLogo />
            </Link>
            <Link
              href="/#product"
              className="flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-amber-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>
          <Button asChild className="bg-amber-600 text-slate-950 hover:bg-amber-500">
            <Link href="/signup">Request access</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-16">
        <div className="mb-16 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/25">
            <Icon className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="mb-4 text-4xl font-bold sm:text-5xl">{app.name}</h1>
          <span className="mb-4 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1 text-sm font-medium text-amber-200">
            Foundational Release
          </span>
          <p className="mb-4 text-xl font-medium text-amber-300">{app.tagline}</p>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-400">{app.description}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {app.highlights.map((h) => (
              <span
                key={h}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300"
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-16 grid gap-4 sm:grid-cols-2">
          {app.features.map((f) => (
            <Card key={f.title} className="border-white/10 bg-white/5 transition-colors hover:border-amber-500/25">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                    <Check className="h-3 w-3 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-100">{f.title}</h3>
                    <p className="text-sm text-slate-400">{f.detail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
          <h2 className="mb-3 text-2xl font-bold">Request Foundational Release access</h2>
          <p className="mb-6 text-slate-400">
            Create an account, confirm your email, and the Slate360 team will review your request before workspace access is granted.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-amber-600 px-8 text-slate-950 hover:bg-amber-500">
              <Link href="/signup">
                Create account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/15 text-slate-200 hover:border-amber-500/40 hover:text-amber-200">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="flex gap-4 p-6">
              <FolderSync className="h-8 w-8 shrink-0 text-teal-300/90" />
              <div>
                <h3 className="font-semibold text-slate-100">SlateDrop</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Shared file delivery and project storage that keeps deliverables tied to the right job.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-white/10 bg-white/5">
            <CardContent className="flex gap-4 p-6">
              <Users className="h-8 w-8 shrink-0 text-teal-300/90" />
              <div>
                <h3 className="font-semibold text-slate-100">Coordination</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Contacts, permissions, and project context so field capture and office review stay aligned.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} Slate360. All rights reserved.</p>
      </footer>
    </div>
  );
}
