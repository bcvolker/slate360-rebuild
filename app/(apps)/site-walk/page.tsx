import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  MapPinned,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";

const featureCards = [
  {
    title: "Field-ready walkthroughs",
    description: "Run punch walks, track issues, and keep teams aligned from one workspace.",
    icon: MapPinned,
  },
  {
    title: "Assignment visibility",
    description: "Surface open items, responsible teams, and escalation risk without leaving the app.",
    icon: ClipboardList,
  },
  {
    title: "Project-safe access",
    description: "Designed to work alongside your dashboard, settings, and project workflows.",
    icon: ShieldCheck,
  },
] as const;

export default async function SiteWalkPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/site-walk");

  const { orgId } = await resolveProjectScope(user.id);
  const entitlements = await resolveOrgEntitlements(orgId);

  if (!entitlements.canAccessStandalonePunchwalk) {
    redirect("/dashboard?error=no_punchwalk");
  }

  const params = await searchParams;
  const isWelcome = params.welcome === "true";

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {isWelcome && (
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/40 px-5 py-4 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold">Welcome to SiteWalk</p>
                <p className="text-sm text-emerald-200/85">
                  Your subscription is active. Launch a session board, review project activity,
                  and start managing field walks.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black shadow-2xl shadow-black/20">
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[1.3fr_0.9fr] lg:px-10 lg:py-10">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Standalone app
                </span>
                <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-300">
                  Slate360 ecosystem
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D4AF37]/12 text-[#D4AF37] ring-1 ring-[#D4AF37]/20">
                    <MapPinned className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-500">
                      SiteWalk
                    </p>
                    <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                      Punch list management that feels at home with the rest of Slate360.
                    </h1>
                  </div>
                </div>

                <p className="max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">
                  This page now follows the darker, more polished visual language used across
                  login, signup, settings, dashboard, Project Hub, and the rest of the apps
                  experience—so SiteWalk feels like part of the same platform instead of a
                  placeholder screen.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/site-walk/board"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-zinc-950 transition hover:bg-[#e7c35a]"
                >
                  Open session board
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/80 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-800"
                >
                  Return to dashboard
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900/60 hover:text-white"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Quick start
                  </p>
                  <h2 className="mt-1 text-lg font-black text-white">What you can do next</h2>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/30 px-3 py-1 text-xs font-medium text-zinc-400">
                  Live workspace
                </div>
              </div>

              <div className="space-y-3">
                {[
                  "Open the board to review active field sessions.",
                  "Jump back to dashboard for broader org context and app navigation.",
                  "Use settings to manage account details without leaving the same visual flow.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-black/20 px-4 py-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF37]" />
                    <p className="text-sm leading-6 text-zinc-300">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-[24px] border border-zinc-800 bg-zinc-900/80 p-6 shadow-lg shadow-black/10 transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] ring-1 ring-[#D4AF37]/15">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.description}</p>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
