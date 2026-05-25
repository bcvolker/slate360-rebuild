import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, ChevronRight, CreditCard, HardDrive, Inbox, LifeBuoy, Mail, MessageSquare, Shield, Upload, User, UsersRound, type LucideIcon } from "lucide-react";
import { mobileTokens } from "@/components/mobile-system";
import { getEntitlements } from "@/lib/entitlements";
import { resolveServerOrgContext, type ServerOrgContext } from "@/lib/server/org-context";
import { resolveUsageTruth, type UsageTruth } from "@/lib/server/usage-truth";
import { BillingPortalButton } from "../_components/BillingPortalButton";
import { AccountDeletionPanel } from "../_components/AccountDeletionPanel";

export const metadata = { title: "More — Slate360" };

type SectionKey = "account" | "organization" | "billing" | "coordination" | "storage" | "support";
type Metric = { label: string; value: string };
type SectionAction = { label: string; detail: string; href: string; icon: LucideIcon; external?: boolean };
type SectionDetails = { title: string; eyebrow: string; description: string; icon: LucideIcon; metrics: Metric[]; actions: SectionAction[]; showBillingPortal?: boolean; billingDisabledReason?: string; showDeletionPanel?: boolean };

const SECTION_KEYS = new Set<SectionKey>(["account", "organization", "billing", "coordination", "storage", "support"]);

const accountIconWell =
  "flex shrink-0 items-center justify-center rounded-lg border border-[#6EA7A0]/20 bg-[#6EA7A0]/10 text-[#6EA7A0]";
const accountRowHover = "transition hover:bg-white/[0.04]";

export default async function MoreSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTION_KEYS.has(section as SectionKey)) notFound();
  const ctx = await resolveServerOrgContext();
  const entitlements = getEntitlements(ctx.tier, { isSlateCeo: ctx.isSlateCeo });
  const usage = ctx.user ? await resolveUsageTruth({ userId: ctx.user.id, orgId: ctx.orgId }) : emptyUsage();
  const details = buildSection(section as SectionKey, ctx, entitlements.label, entitlements.maxStorageGB, entitlements.maxCredits, usage);
  const Icon = details.icon;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 pb-28 text-slate-50 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
      <Link
        href="/more"
        className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 text-sm font-medium text-zinc-400 transition-colors hover:border-[#6EA7A0]/20 hover:bg-white/[0.07] hover:text-[#6EA7A0]"
      >
        <ArrowLeft className="h-4 w-4" /> Account Hub
      </Link>

      <section className={`${mobileTokens.panelBase} p-5`}>
        <span className={`${accountIconWell} h-12 w-12`}>
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A3AED0]">{details.eyebrow}</p>
        <h1 className="mt-2 text-xl font-bold tracking-tight text-white">{details.title}</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-zinc-400">{details.description}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {details.metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
        </div>
      </section>

      <section className={`overflow-hidden ${mobileTokens.panelBase}`}>
        {details.showBillingPortal ? <BillingPortalButton disabledReason={details.billingDisabledReason} /> : null}
        {details.actions.map((action) => <ActionRow key={`${action.label}-${action.href}`} action={action} />)}
      </section>

      {details.showDeletionPanel ? <AccountDeletionPanel /> : null}
    </div>
  );
}

function buildSection(section: SectionKey, ctx: ServerOrgContext, planLabel: string, maxStorageGB: number, maxCredits: number, usage: UsageTruth): SectionDetails {
  const email = ctx.user?.email ?? "Signed-in user";
  const orgName = ctx.orgName ?? "Personal workspace";
  const role = ctx.role ?? "member";
  const storage = `${usage.storageUsedGb.toFixed(1)} / ${maxStorageGB} GB`;
  const billingDisabledReason = !ctx.isAdmin ? "Billing is managed by your organization admin." : ctx.isSlateCeo ? "Internal owner billing is managed outside Stripe self-service." : undefined;

  const sections: Record<SectionKey, SectionDetails> = {
    account: {
      title: "Account",
      eyebrow: "Profile & security",
      description: "Manage profile, security, legal links, and account deletion from the mobile Account Hub.",
      icon: User,
      metrics: [{ label: "Email", value: email }, { label: "Plan", value: planLabel }, { label: "Role", value: role }],
      showDeletionPanel: true,
      actions: [
        { label: "Profile & settings", detail: "Update profile, password, and security preferences.", href: "/settings", icon: User },
        { label: "Help & support", detail: "Email support for billing, access, and product questions.", href: "/more/support", icon: LifeBuoy },
        { label: "Privacy policy", detail: "Review Slate360 data and privacy commitments.", href: "/privacy", icon: Shield },
        { label: "Terms of service", detail: "Review platform subscription and acceptable-use terms.", href: "/terms", icon: LifeBuoy },
        { label: "Communication inbox", detail: "Messages, file-share alerts, and team responses.", href: "/coordination/inbox", icon: Inbox },
      ],
    },
    organization: {
      title: "Organization",
      eyebrow: "Workspace",
      description: "Keep the workspace context, contacts, projects, and admin responsibilities in one place.",
      icon: Building2,
      metrics: [{ label: "Workspace", value: orgName }, { label: "Access", value: role }, { label: "Admin", value: ctx.isAdmin ? "Yes" : "No" }],
      actions: [
        { label: "Projects directory", detail: "Open active projects and field-project workspaces.", href: "/projects", icon: Building2 },
        { label: "Team contacts", detail: "Manage people used for Site Walk assignments and SlateDrop sends.", href: "/coordination/contacts", icon: UsersRound },
        { label: "Organization settings", detail: "Review the account workspace attached to this organization.", href: "/settings", icon: Shield },
      ],
    },
    billing: {
      title: "Billing & Apps",
      eyebrow: "Subscription",
      description: "Review plan limits, app access, credits, storage, invoices, and upgrade paths without leaving the app shell.",
      icon: CreditCard,
      metrics: [{ label: "Plan", value: planLabel }, { label: "Credits", value: maxCredits.toLocaleString() }, { label: "Storage", value: `${maxStorageGB} GB` }],
      showBillingPortal: true,
      billingDisabledReason,
      actions: [
        { label: "View plan options", detail: "Compare Slate360 plans and app bundles.", href: "/plans", icon: CreditCard },
        { label: "Storage usage", detail: `Current usage: ${storage}.`, href: "/more/storage", icon: HardDrive },
      ],
    },
    coordination: {
      title: "Coordination",
      eyebrow: "Team operations",
      description: "Jump into the shared tools that coordinate messages, project contacts, deadlines, and handoffs.",
      icon: MessageSquare,
      metrics: [{ label: "Inbox", value: "Messages" }, { label: "Contacts", value: "Directory" }, { label: "Calendar", value: "Schedule" }],
      actions: [
        { label: "Inbox", detail: "Messages, file shares, feedback replies, and unread work.", href: "/coordination/inbox", icon: Inbox },
        { label: "Contacts", detail: "Stakeholders for Site Walk, SlateDrop, and project communication.", href: "/coordination/contacts", icon: UsersRound },
        { label: "Calendar", detail: "Schedule inspections, milestones, and project events.", href: "/coordination/calendar", icon: CalendarDays },
      ],
    },
    storage: {
      title: "Storage",
      eyebrow: "SlateDrop",
      description: "Track real SlateDrop capacity and open the file tools used by current and future Slate360 apps.",
      icon: HardDrive,
      metrics: [{ label: "Used", value: storage }, { label: "Files", value: usage.fileCount.toLocaleString() }, { label: "Images", value: usage.imageCount.toLocaleString() }],
      actions: [
        { label: "Open SlateDrop", detail: "Browse workspace files, folders, shares, and requests.", href: "/slatedrop", icon: HardDrive },
        { label: "Upload files", detail: "Add plans, photos, reports, models, and app assets.", href: "/slatedrop/upload", icon: Upload },
        { label: "Billing & storage limits", detail: "Review capacity included with this subscription.", href: "/more/billing", icon: CreditCard },
      ],
    },
    support: {
      title: "Legal / Support",
      eyebrow: "Help",
      description: "Get to support, policies, and app feedback without dropping into old public-page styling first.",
      icon: LifeBuoy,
      metrics: [{ label: "Support", value: "Email" }, { label: "Privacy", value: "Policy" }, { label: "Terms", value: "Policy" }],
      actions: [
        { label: "Email support", detail: "Send support, billing, or account questions to Slate360.", href: "mailto:support@slate360.ai", icon: Mail, external: true },
        { label: "Privacy policy", detail: "Review Slate360 data and privacy commitments.", href: "/privacy", icon: Shield },
        { label: "Terms of service", detail: "Review platform subscription and acceptable-use terms.", href: "/terms", icon: LifeBuoy },
      ],
    },
  };
  return sections[section];
}

function ActionRow({ action }: { action: SectionAction }) {
  const Icon = action.icon;
  const className = `flex min-h-16 items-center gap-3 border-b border-white/[0.06] px-4 last:border-b-0 ${accountRowHover}`;
  const content = <RowContent icon={Icon} label={action.label} detail={action.detail} />;
  if (action.external) return <a href={action.href} className={className}>{content}</a>;
  return <Link href={action.href} className={className}>{content}</Link>;
}

function RowContent({ icon: Icon, label, detail }: { icon: LucideIcon; label: string; detail: string }) {
  return (
    <>
      <span className={`${accountIconWell} h-10 w-10`}><Icon className="h-5 w-5" strokeWidth={1.75} /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white">{label}</span><span className="mt-0.5 block text-xs font-medium text-zinc-400">{detail}</span></span>
      <ChevronRight className="h-4 w-4 text-zinc-500" />
    </>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  return <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{metric.label}</p><p className="mt-1 truncate text-xs font-medium text-zinc-200">{metric.value}</p></div>;
}

function emptyUsage(): UsageTruth {
  return { storageUsedBytes: 0, storageUsedGb: 0, fileCount: 0, modelsCount: 0, imageCount: 0 };
}
