import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronRight,
  Inbox,
  LifeBuoy,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";
import { mobileTokens } from "@/components/mobile-system";
import { cn } from "@/lib/utils";
import { getEntitlements } from "@/lib/entitlements";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Account — Slate360" };

type AccountLink = {
  label: string;
  detail: string;
  href: string;
  icon: LucideIcon;
};

export default async function MoreAccountPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/more/account");

  const entitlements = getEntitlements(ctx.tier, { isSlateCeo: ctx.isSlateCeo });
  const email = ctx.user.email ?? "Signed-in user";
  const orgName = ctx.orgName ?? "Personal workspace";
  const role = ctx.role ?? "member";

  const links: AccountLink[] = [
    {
      label: "Profile & settings",
      detail: "Update profile, password, and security preferences.",
      href: "/settings",
      icon: User,
    },
    {
      label: "Communication inbox",
      detail: "Messages, file-share alerts, and team responses.",
      href: "/coordination/inbox",
      icon: Inbox,
    },
    {
      label: "Help & support",
      detail: "Email support for billing, access, and product questions.",
      href: "/more/support",
      icon: LifeBuoy,
    },
    {
      label: "Privacy policy",
      detail: "Review Slate360 data and privacy commitments.",
      href: "/privacy",
      icon: Shield,
    },
    {
      label: "Terms of service",
      detail: "Review platform subscription and acceptable-use terms.",
      href: "/terms",
      icon: LifeBuoy,
    },
  ];

  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={cn(mobileTokens.mobileIconWell, "h-12 w-12")} aria-hidden>
          <User className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className={cn("mt-4", mobileTokens.mobileEyebrowLabel)}>Profile &amp; security</p>
        <h1 className={cn("mt-2", mobileTokens.moduleTitle)}>Account</h1>
        <p className={mobileTokens.moduleSubtitle}>
          Manage your profile, security, and legal information.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <MetricTile label="Email" value={email} />
          <MetricTile label="Plan" value={entitlements.label} />
          <MetricTile label="Workspace" value={orgName} />
          <MetricTile label="Role" value={role} />
        </div>
      </section>

      <section className={cn("overflow-hidden", mobileTokens.panelBase)}>
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={mobileTokens.mobileGlassRowLink}>
              <span className={cn(mobileTokens.mobileIconWell, "h-9 w-9")}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">{item.label}</span>
                <span className="mt-0.5 block truncate text-xs font-medium text-zinc-400">
                  {item.detail}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(mobileTokens.mobileGlassCardSurface, "px-3 py-2")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-zinc-100">{value}</p>
    </div>
  );
}
