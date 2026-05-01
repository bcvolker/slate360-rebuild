import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CreditCard, LifeBuoy, Shield, User } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "More — Slate360" };

const SECTIONS = {
  account: {
    title: "Account",
    eyebrow: "Profile",
    icon: User,
    detail: "Manage your profile, password, notifications, and signed-in devices without leaving the app shell.",
    actions: [
      { label: "Profile details", href: "/my-account?tab=profile" },
      { label: "Security", href: "/my-account?tab=security" },
      { label: "Notifications", href: "/my-account?tab=notifications" },
    ],
  },
  organization: {
    title: "Organization",
    eyebrow: "Workspace",
    icon: Building2,
    detail: "Review workspace identity, members, roles, permissions, and audit controls for admins.",
    actions: [
      { label: "Workspace settings", href: "/my-account?tab=workspace" },
      { label: "Members & roles", href: "/my-account?tab=members" },
      { label: "Permissions", href: "/my-account?tab=permissions" },
    ],
  },
  billing: {
    title: "Billing & Apps",
    eyebrow: "Subscription",
    icon: CreditCard,
    detail: "See your current plan, app access, seats, credits, storage, and upgrade paths.",
    actions: [
      { label: "Plan & billing", href: "/my-account?tab=billing" },
      { label: "Usage & credits", href: "/my-account?tab=data" },
      { label: "Plans", href: "/plans" },
    ],
  },
  support: {
    title: "Legal / Support",
    eyebrow: "Help",
    icon: LifeBuoy,
    detail: "Open privacy, terms, feedback, and support resources from inside the app utility area.",
    actions: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Report or suggest", href: "/coordination/inbox" },
    ],
  },
} as const;

export default async function MoreSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const copy = SECTIONS[section as keyof typeof SECTIONS];
  if (!copy) notFound();
  const ctx = await resolveServerOrgContext();
  const Icon = copy.icon;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 pb-28 text-slate-50 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
      <Link href="/more" className="inline-flex min-h-10 w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-slate-200 hover:bg-white/10">
        <ArrowLeft className="h-4 w-4" /> More
      </Link>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-200 ring-1 ring-sky-400/20">
          <Icon className="h-6 w-6" />
        </span>
        <p className="mt-4 text-[11px] font-black uppercase tracking-[0.18em] text-sky-200">{copy.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-black text-white">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{copy.detail}</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-xs font-bold text-slate-400">
          Signed in as <span className="text-slate-200">{ctx.user?.email ?? "your Slate360 account"}</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-md">
        {copy.actions.map((action) => (
          <Link key={action.href} href={action.href} className="flex min-h-14 items-center justify-between border-b border-white/10 px-4 text-sm font-black text-white transition last:border-b-0 hover:bg-white/10">
            {action.label}
            <Shield className="h-4 w-4 text-slate-500" />
          </Link>
        ))}
      </section>
    </div>
  );
}