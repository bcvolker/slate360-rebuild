import Link from "next/link";
import { Building2, ChevronRight, CreditCard, HardDrive, LifeBuoy, MessageSquare, User, Wrench } from "lucide-react";
import { getEntitlements } from "@/lib/entitlements";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveUsageTruth } from "@/lib/server/usage-truth";
import { SignOutRow } from "./_components/SignOutRow";

export const metadata = {
  title: "More — Slate360",
};

type MoreItem = {
  label: string;
  href: string;
  detail: string;
  badge?: string;
  icon: typeof User;
};

export default async function MorePage() {
  const ctx = await resolveServerOrgContext();
  const entitlements = getEntitlements(ctx.tier, { isSlateCeo: ctx.isSlateCeo });
  const usage = ctx.user ? await resolveUsageTruth({ userId: ctx.user.id, orgId: ctx.orgId }) : null;
  const storageLabel = usage ? `${usage.storageUsedGb.toFixed(1)} / ${entitlements.maxStorageGB} GB` : `${entitlements.maxStorageGB} GB included`;

  const items: MoreItem[] = [
    { label: "Account", href: "/more/account", detail: "Profile, security, and preferences", badge: ctx.user?.email ?? undefined, icon: User },
    { label: "Organization", href: "/more/organization", detail: ctx.orgName ?? "Personal workspace", badge: ctx.role ?? "member", icon: Building2 },
    { label: "Billing & Apps", href: "/more/billing", detail: "Subscription, app access, credits", badge: entitlements.label, icon: CreditCard },
    { label: "Coordination", href: "/more/coordination", detail: "Inbox, contacts, calendar", icon: MessageSquare },
    { label: "Storage", href: "/more/storage", detail: "SlateDrop files and usage", badge: storageLabel, icon: HardDrive },
    { label: "Legal / Support", href: "/more/support", detail: "Policies, support, feedback", icon: LifeBuoy },
  ];

  if (ctx.hasOperationsConsoleAccess) {
    items.push({ label: "Operations Console", href: "/operations-console", detail: "Owner/staff release controls", badge: "Internal", icon: Wrench });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 pb-28 text-slate-50 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur-md">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-400">Account Hub</p>
        <h1 className="mt-1 text-2xl font-black text-white">Workspace controls</h1>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <SummaryTile label="Signed in" value={ctx.user?.email ?? "Unknown"} />
          <SummaryTile label="Plan" value={entitlements.label} />
          <SummaryTile label="Storage" value={storageLabel} />
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-lg backdrop-blur-md">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="flex min-h-16 items-center gap-3 border-b border-white/10 px-4 transition hover:bg-amber-500/10 last:border-b-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950">
                  <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-white">{item.label}</span>
                <span className="mt-0.5 block truncate text-xs font-bold text-slate-400">{item.detail}</span>
              </span>
              {item.badge ? <span className="hidden max-w-[9rem] truncate rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-200 sm:inline-flex">{item.badge}</span> : null}
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </Link>
          );
        })}
        <SignOutRow />
      </section>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-slate-200">{value}</p>
    </div>
  );
}
