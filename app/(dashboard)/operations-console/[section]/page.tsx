import { notFound, redirect } from "next/navigation";
import { OperationsConsoleNav } from "@/components/dashboard/operations-console/OperationsConsoleNav";
import { resolveServerOrgContext } from "@/lib/server/org-context";

const sectionCopy: Record<string, { title: string; detail: string; bullets: string[] }> = {
  users: {
    title: "Users & Organizations",
    detail: "Manage accounts, organizations, roles, seats, access history, and project/contact ownership.",
    bullets: ["User search and org drill-in", "Role and seat management", "Contact and project ownership map"],
  },
  revenue: {
    title: "Revenue Operations",
    detail: "Track trials, subscriptions, app bundles, invoices, failed payments, and conversion opportunities.",
    bullets: ["MRR and app-level revenue", "Trial-to-paid conversion", "Stripe customer and invoice links"],
  },
  "product-health": {
    title: "Product Health",
    detail: "Monitor module usage, terminal buttons, route health, error trends, feedback volume, and release readiness.",
    bullets: ["Dead-link/action scanner", "Feedback and bug trends", "Release gate status"],
  },
  systems: {
    title: "Systems Console",
    detail: "Inspect storage, email, cron jobs, integrations, deployment health, and environment configuration.",
    bullets: ["S3/R2 runtime checks", "Email delivery status", "Vercel deploy and cron health"],
  },
};

export default async function OperationsSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { user, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!canAccessOperationsConsole) notFound();

  const { section } = await params;
  const copy = sectionCopy[section];
  if (!copy) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-bold text-foreground">{copy.title}</h1>
        <p className="text-xs text-muted-foreground">{copy.detail}</p>
      </header>
      <OperationsConsoleNav active={`/operations-console/${section}`} />
      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-slate-950">Build target</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {copy.bullets.map((bullet) => (
            <li key={bullet} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">{bullet}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
