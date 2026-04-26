import { notFound, redirect } from "next/navigation";
import { OperationsConsoleNav } from "@/components/dashboard/operations-console/OperationsConsoleNav";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getOperationsConsoleCounts } from "@/lib/server/operations-console-counts";

const sectionCopy: Record<string, { title: string; detail: string; bullets: string[]; workflows: string[] }> = {
  users: {
    title: "Users & Organizations",
    detail: "Manage accounts, organizations, roles, seats, access history, app grants, and project/contact ownership.",
    bullets: ["User search and org drill-in", "Role and seat management", "Contact and project ownership map"],
    workflows: ["Extend or revoke Version 1 access", "Grant app overrides with optional expiration", "Assign enterprise seats and per-feature permissions"],
  },
  revenue: {
    title: "Revenue Operations",
    detail: "Track trials, subscriptions, app bundles, invoices, failed payments, price experiments, and conversion opportunities.",
    bullets: ["MRR, ARR, churn, margin, and runway", "Trial-to-paid conversion", "Stripe customer and invoice links"],
    workflows: ["Extend trial dates", "Model pricing what-if scenarios", "Edit plan and bundle publishing targets"],
  },
  "product-health": {
    title: "Product Health",
    detail: "Monitor module usage, terminal buttons, route health, error trends, feedback volume, and release readiness.",
    bullets: ["Dead-link/action scanner", "Feedback and bug trends", "Release gate status"],
    workflows: ["Prioritize action list from feedback", "Promote feature requests into roadmap", "Watch route, build, and module health"],
  },
  systems: {
    title: "Systems Console",
    detail: "Inspect storage, email, cron jobs, integrations, deployment health, and environment configuration.",
    bullets: ["S3/R2 runtime checks", "Email delivery status", "Vercel deploy and cron health"],
    workflows: ["Run storage diagnostics", "Review scheduled jobs", "Check Vercel, Supabase, Stripe, and email configuration"],
  },
};

export default async function OperationsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { user, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!canAccessOperationsConsole) notFound();

  const { section } = await params;
  const copy = sectionCopy[section];
  if (!copy) notFound();
  const counts = await getOperationsConsoleCounts();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">{copy.title}</h1>
        <p className="text-xs text-muted-foreground">{copy.detail}</p>
      </header>
      <OperationsConsoleNav active={`/operations-console/${section}`} counts={counts} />
      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-slate-950">Build target</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {copy.bullets.map((bullet) => (
            <li key={bullet} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">{bullet}</li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <p className="text-sm font-black text-slate-950">CEO control-center workflows</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {copy.workflows.map((workflow) => (
            <li key={workflow} className="rounded-2xl border border-blue-200 bg-white p-4 text-sm font-semibold text-slate-700">{workflow}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
