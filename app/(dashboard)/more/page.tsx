import Link from "next/link";
import { Building2, ChevronRight, CreditCard, FileText, HardDrive, LifeBuoy, MessageSquare, Shield, Trash2, User, Wrench } from "lucide-react";
import { mobileTokens } from "@/components/mobile-system";
import { getEntitlements } from "@/lib/entitlements";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveUsageTruth } from "@/lib/server/usage-truth";
import { SignOutRow } from "./_components/SignOutRow";

const accountIconWell =
  "flex shrink-0 items-center justify-center rounded-lg border border-[#6EA7A0]/20 bg-[#6EA7A0]/10 text-[#6EA7A0]";
const accountRowHover = "transition hover:bg-white/[0.04]";

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

type EssentialItem = {
  label: string;
  href: string;
  detail: string;
  icon: typeof User;
  external?: boolean;
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

  const essentials: EssentialItem[] = [
    { label: "Profile & settings", href: "/settings", detail: "Name, preferences, password, and security", icon: User },
    { label: "Help & support", href: "/more/support", detail: "Email support and workspace help", icon: LifeBuoy },
    { label: "Privacy policy", href: "/privacy", detail: "How Slate360 handles your data", icon: Shield },
    { label: "Terms of service", href: "/terms", detail: "Platform subscription and use terms", icon: FileText },
    { label: "Delete account", href: "/more/account#delete-account", detail: "Permanently remove your account", icon: Trash2 },
  ];

  if (ctx.hasOperationsConsoleAccess) {
    items.push({ label: "Operations Console", href: "/operations-console", detail: "Owner/staff release controls", badge: "Internal", icon: Wrench });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 pb-28 text-slate-50 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
      <section className={`${mobileTokens.panelBase} p-5`}>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A3AED0]">Account Hub</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Workspace controls</h1>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <SummaryTile label="Signed in" value={ctx.user?.email ?? "Unknown"} />
          <SummaryTile label="Plan" value={entitlements.label} />
          <SummaryTile label="Storage" value={storageLabel} />
        </div>
      </section>

      <section className={`overflow-hidden ${mobileTokens.panelBase}`}>
        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A3AED0]">Account essentials</p>
        </div>
        {essentials.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex min-h-14 items-center gap-3 border-b border-white/[0.06] px-4 last:border-b-0 ${accountRowHover}`}
            >
              <span className={`${accountIconWell} h-9 w-9`}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">{item.label}</span>
                <span className="mt-0.5 block truncate text-xs font-medium text-zinc-400">{item.detail}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </Link>
          );
        })}
      </section>

      <section className={`overflow-hidden ${mobileTokens.panelBase}`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className={`flex min-h-16 items-center gap-3 border-b border-white/[0.06] px-4 last:border-b-0 ${accountRowHover}`}>
              <span className={`${accountIconWell} h-10 w-10`}>
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">{item.label}</span>
                <span className="mt-0.5 block truncate text-xs font-medium text-zinc-400">{item.detail}</span>
              </span>
              {item.badge ? <span className="hidden max-w-[9rem] truncate rounded-full border border-[#6EA7A0]/20 bg-[#6EA7A0]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6EA7A0] sm:inline-flex">{item.badge}</span> : null}
              <ChevronRight className="h-4 w-4 text-zinc-500" />
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
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-zinc-200">{value}</p>
    </div>
  );
}
