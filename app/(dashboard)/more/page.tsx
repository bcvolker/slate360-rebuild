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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">More</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Everything else in Slate360</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          The bottom navigation stays focused on daily work. More packages account, billing, project administration, app access, and secondary tools.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm transition-all hover:border-blue-500 hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-slate-950">{item.label}</h2>
                    {item.active ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">Ready</span> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Settings className="h-4 w-4 text-blue-700" />
          As subscriptions change, app-specific file folders and surfaces should appear in SlateDrop without changing the primary bottom navigation.
        </div>
      </section>
    </div>
  );
}
