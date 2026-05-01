import Link from "next/link";
import { CreditCard, FolderOpen, HardDrive, MessageSquare, Settings, User, Workflow, Wrench } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";

export const metadata = {
  title: "More — Slate360",
};

type MoreItem = {
  label: string;
  description: string;
  href: string;
  icon: typeof FolderOpen;
  active?: boolean;
};

export default async function MorePage() {
  const { orgId, hasOperationsConsoleAccess } = await resolveServerOrgContext();
  const entitlements = await resolveOrgEntitlements(orgId);

  const items: MoreItem[] = [
    { label: "Projects", description: "Sites, project workspaces, teams, and records.", href: "/projects", icon: FolderOpen, active: true },
    { label: "SlateDrop", description: "App-aware folders, uploads, saved files, and shares.", href: "/slatedrop", icon: HardDrive, active: true },
    { label: "Coordination Hub", description: "Threads, contacts, notifications, and collaboration.", href: "/coordination", icon: MessageSquare, active: true },
    { label: "My Account", description: "Profile, organization, notifications, and preferences.", href: "/my-account", icon: User, active: true },
    { label: "Billing", description: "Subscriptions, app access, storage, and seats.", href: "/my-account?tab=billing", icon: CreditCard, active: true },
    {
      label: "App Subscriptions",
      description: "Add Site Walk, 360 Tours, Design Studio, or Content Studio.",
      href: "/my-account?tab=billing",
      icon: Workflow,
      active: entitlements.canAccessHub,
    },
  ];

  if (hasOperationsConsoleAccess) {
    items.push({ label: "Operations Console", description: "Internal Version 1 launch access and platform controls.", href: "/operations-console", icon: Wrench, active: true });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 text-slate-50 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">More</p>
        <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Settings, coordination, and workspace controls</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
          This is the utility drawer, not a marketing page. Open account, billing, contacts, inbox, storage, and administrative controls from one contained app surface.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur-md transition-all hover:border-blue-400/70 hover:bg-blue-500/10">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-white">{item.label}</h2>
                    {item.active ? <span className="rounded-full bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold text-emerald-100 ring-1 ring-emerald-300/20">Ready</span> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4 text-slate-300 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3 text-sm">
          <Settings className="h-4 w-4 text-blue-200" />
          As subscriptions change, app-specific file folders and surfaces should appear in SlateDrop without changing the primary bottom navigation.
        </div>
      </section>
    </div>
  );
}
