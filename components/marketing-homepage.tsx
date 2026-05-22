"use client";

/**
 * Slate360 public marketing homepage — dark graphite, amber primary, teal-smoke accents.
 * Site Walk is the lead product; platform infrastructure (SlateDrop, Coordination) is secondary.
 */

import { useState } from "react";
import Link from "next/link";
import {
  Menu,
  MapPin,
  FolderSync,
  Users,
  Check,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
  Mail,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SlateLogo } from "@/components/shared/SlateLogo";
import GetTheAppButton from "@/components/home/GetTheAppButton";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "Platform", href: "#platform" },
  { label: "Access", href: "#access" },
];

const TRUST_CATEGORIES = [
  "General Contractors",
  "Architecture Firms",
  "Real Estate Developers",
  "Property Managers",
  "Construction Operations",
];

const SITE_WALK_FEATURES = [
  "Capture photos, voice, and notes as you walk the job",
  "Keep every record geolocated, time-stamped, and plan-aware",
  "Turn field documentation into punch lists and branded reports",
  "Share deliverables with clients and stakeholders in minutes",
  "Work offline on site; sync when connectivity returns",
  "Reduce photo clutter with project context that lasts",
];

const PLATFORM_ITEMS = [
  {
    name: "SlateDrop",
    icon: FolderSync,
    description:
      "Secure file delivery and shared project storage so captures and deliverables stay tied to the right job.",
  },
  {
    name: "Coordination",
    icon: Users,
    description:
      "Contacts, permissions, and project context so the field and office work from the same current information.",
  },
];

function Header({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/10 bg-[#0B0F15]/90 backdrop-blur-lg">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <SlateLogo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-teal-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isLoggedIn ? (
            <>
              <Button variant="ghost" asChild className="text-slate-300 hover:bg-white/10 hover:text-white">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" asChild className="border-white/15 text-slate-200 hover:border-amber-500/40">
                <Link href="/auth/logout">Sign out</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="text-slate-300 hover:bg-white/10 hover:text-white">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="bg-amber-600 text-slate-950 hover:bg-amber-500">
                <Link href="/signup">Request access</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[280px] border-white/10 bg-[#151A23] text-slate-200 [&>button]:text-slate-200"
          >
            <div className="flex flex-col gap-4 py-4">
              <SlateLogo className="h-6 w-auto self-start" />
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-teal-300"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/apps/site-walk"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-amber-300"
                >
                  Site Walk
                </Link>
              </nav>
              <div className="flex flex-col gap-3 border-t border-white/10 pt-3">
                {isLoggedIn ? (
                  <Button asChild className="bg-amber-600 text-slate-950 hover:bg-amber-500">
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      Dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" asChild className="border-white/15 text-slate-200">
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                        Sign in
                      </Link>
                    </Button>
                    <Button asChild className="bg-amber-600 text-slate-950 hover:bg-amber-500">
                      <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                        Request access
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-[100px]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
        <div className="space-y-6 text-center lg:text-left">
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-amber-200"
          >
            <Zap className="mr-1.5 h-3.5 w-3.5" />
            Foundational Release — Site Walk first
          </Badge>

          <h1 className="text-balance text-[2rem] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
            The real-time bridge between the{" "}
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              field and the office
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-pretty text-base leading-relaxed text-slate-400 lg:mx-0 lg:text-lg">
            Walk the project, capture conditions in context, and turn what you documented into branded
            deliverables — punch lists, reports, and shareable outputs — without rebuilding the story later.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            {isLoggedIn ? (
              <Button asChild size="lg" className="bg-amber-600 text-slate-950 hover:bg-amber-500">
                <Link href="/dashboard">
                  Open workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="bg-amber-600 text-slate-950 hover:bg-amber-500">
                  <Link href="/signup">
                    Request access
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/15 text-slate-200 hover:border-amber-500/40 hover:text-amber-200"
                >
                  <Link href="/login">Sign in</Link>
                </Button>
              </>
            )}
            <GetTheAppButton className="w-full sm:w-auto" />
          </div>

          <p className="text-sm text-slate-500">
            Accounts are reviewed individually before workspace access is granted.
          </p>
        </div>

        <div className="mx-auto w-full max-w-lg lg:max-w-none">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-2 ring-1 ring-white/10 backdrop-blur-md">
            <div className="rounded-2xl border border-white/5 bg-[#151A23] p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/25">
                  <MapPin className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Site Walk</p>
                  <p className="text-sm text-slate-400">Contextual site documentation</p>
                </div>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-300">
                {SITE_WALK_FEATURES.slice(0, 4).map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="border-y border-white/10 bg-[#151A23]/60 py-10 px-4">
      <div className="container mx-auto">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
          Built for teams across the AEC industry
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {TRUST_CATEGORIES.map((category) => (
            <div
              key={category}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300"
            >
              {category}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteWalkSection() {
  return (
    <section id="product" className="px-4 py-20 sm:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-200">
            Site Walk
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Contextual capture that becomes client-ready work
          </h2>
          <p className="mx-auto max-w-2xl leading-relaxed text-slate-400">
            Site Walk is the first Slate360 app in the Foundational Release — built for supers, PMs, and
            field teams who need documentation that survives the walk back to the office.
          </p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-md">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/25">
                <MapPin className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-2xl text-white">Site Walk</CardTitle>
                <CardDescription className="text-base text-slate-400">
                  Walk the project. Capture everything that matters. Deliver it with your brand.
                </CardDescription>
              </div>
              <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                Foundational Release
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="grid gap-2 sm:grid-cols-2">
              {SITE_WALK_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-amber-600 text-slate-950 hover:bg-amber-500">
                <Link href="/signup">
                  Request access
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/15 text-slate-200 hover:border-amber-500/40 hover:text-amber-200"
              >
                <Link href="/apps/site-walk">
                  Learn more
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function PlatformSection() {
  return (
    <section id="platform" className="border-t border-white/10 bg-[#151A23]/50 px-4 py-20 sm:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4 border-teal-500/25 bg-teal-500/10 text-teal-200">
            Platform infrastructure
          </Badge>
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Shared context for every deliverable
          </h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            Site Walk sits on Slate360 platform services — so files, contacts, and permissions stay aligned
            from capture through client delivery.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PLATFORM_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.name} className="border-white/10 bg-[#0B0F15]/80">
                <CardContent className="flex gap-4 p-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 ring-1 ring-teal-500/20">
                    <Icon className="h-6 w-6 text-teal-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Why teams use Slate360</h2>
          <p className="mx-auto max-w-2xl text-slate-400">
            Connect capture, project context, and office outputs so nobody rebuilds the story from scattered photos.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: FolderSync,
              title: "Stop losing project meaning",
              body: "Photos and notes stay tied to the project context that explains them.",
            },
            {
              icon: Sparkles,
              title: "Ship branded deliverables faster",
              body: "Turn site documentation into professional outputs in minutes, not hours of rework.",
            },
            {
              icon: Users,
              title: "Align field and office",
              body: "Walkers and reviewers work from the same current, contextualized record.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-white/10 bg-white/5">
                <CardContent className="p-6 text-center">
                  <Icon className="mx-auto mb-3 h-7 w-7 text-amber-400" />
                  <p className="mb-2 font-semibold text-white">{item.title}</p>
                  <p className="text-sm leading-relaxed text-slate-400">{item.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FoundationalReleaseSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section id="access" className="border-t border-white/10 px-4 py-20 sm:px-6">
      <div className="container mx-auto max-w-3xl text-center">
        <Badge variant="outline" className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-200">
          <Shield className="mr-1.5 h-3.5 w-3.5" />
          Foundational Release
        </Badge>
        <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">Request access to Slate360</h2>
        <p className="mb-8 leading-relaxed text-slate-400">
          Create an account and confirm your email. The Slate360 team reviews each request before granting
          workspace access. Self-serve billing is not part of this release — you get Site Walk and platform
          infrastructure while we onboard founding teams.
        </p>
        <ul className="mb-8 space-y-2 text-left text-sm text-slate-300 sm:mx-auto sm:max-w-md">
          {[
            "Site Walk for contextual field documentation",
            "Branded deliverables and secure sharing",
            "SlateDrop file delivery tied to projects",
            "Coordination for contacts and permissions",
            "Data retained as Slate360 expands",
          ].map((line) => (
            <li key={line} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              {line}
            </li>
          ))}
        </ul>
        <Button asChild size="lg" className="bg-amber-600 px-8 text-slate-950 hover:bg-amber-500">
          <Link href={isLoggedIn ? "/dashboard" : "/signup"}>
            {isLoggedIn ? "Open workspace" : "Create account"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        {!isLoggedIn && (
          <p className="mt-4 text-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-amber-300 hover:text-amber-200">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

function FinalCTASection({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="container mx-auto max-w-4xl">
        <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-[#151A23] to-[#0B0F15]">
          <div className="h-1 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
          <CardContent className="px-8 py-12 text-center">
            <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
              Ready to connect field capture with office delivery?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-slate-400">
              Start with Site Walk in the Foundational Release. Install the PWA on your phone for the best
              field experience.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-amber-600 text-slate-950 hover:bg-amber-500">
                <Link href={isLoggedIn ? "/dashboard" : "/signup"}>
                  {isLoggedIn ? "Open workspace" : "Request access"}
                </Link>
              </Button>
              <GetTheAppButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0B0F15]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <Link href="/" className="mb-4 flex items-center">
              <SlateLogo />
            </Link>
            <p className="text-sm text-slate-400">
              Field-to-office construction documentation. Site Walk first.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#product" className="text-slate-400 transition-colors hover:text-teal-300">
                  Site Walk
                </Link>
              </li>
              <li>
                <Link href="#platform" className="text-slate-400 transition-colors hover:text-teal-300">
                  Platform
                </Link>
              </li>
              <li>
                <Link href="/install" className="text-slate-400 transition-colors hover:text-teal-300">
                  Install app
                </Link>
              </li>
              <li>
                <Link href="#access" className="text-slate-400 transition-colors hover:text-teal-300">
                  Request access
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-slate-400 transition-colors hover:text-teal-300">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-slate-400 transition-colors hover:text-teal-300">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@slate360.ai"
                  className="text-slate-400 transition-colors hover:text-teal-300"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-slate-500">
            <span className="text-amber-400/90">© {new Date().getFullYear()} Slate360.</span> All rights reserved.
          </p>
          <a
            href="mailto:support@slate360.ai"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-amber-300"
          >
            <Mail className="h-4 w-4" />
            support@slate360.ai
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingHomepage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <div className="dark min-h-screen overflow-x-hidden bg-[#0B0F15] text-slate-200">
      <Header isLoggedIn={isLoggedIn} />
      <main>
        <HeroSection isLoggedIn={isLoggedIn} />
        <TrustBar />
        <SiteWalkSection />
        <PlatformSection />
        <WorkflowSection />
        <FoundationalReleaseSection isLoggedIn={isLoggedIn} />
        <FinalCTASection isLoggedIn={isLoggedIn} />
      </main>
      <Footer />
    </div>
  );
}
