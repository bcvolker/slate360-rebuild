import Link from "next/link";
import { BarChart3, CreditCard, Inbox, ServerCog, Users2, Wrench, type LucideIcon } from "lucide-react";
import type { OperationsConsoleCounts } from "@/lib/server/operations-console-counts";

const sections: { label: string; href: string; icon: LucideIcon; detail: string; countKey?: keyof OperationsConsoleCounts }[] = [
  { label: "Access Queue", href: "/operations-console", icon: Users2, detail: "Approve Version 1 accounts and revoke access.", countKey: "pendingAccess" },
  { label: "Feedback Inbox", href: "/operations-console/feedback", icon: Inbox, detail: "Bugs, feature requests, screenshots, and user replies.", countKey: "openFeedback" },
  { label: "Users & Orgs", href: "/operations-console/users", icon: Wrench, detail: "Accounts, organizations, roles, seats, and contacts." },
  { label: "Revenue", href: "/operations-console/revenue", icon: CreditCard, detail: "Trials, subscriptions, billing, and conversion health." },
  { label: "Product Health", href: "/operations-console/product-health", icon: BarChart3, detail: "Module usage, dead links, errors, and release readiness.", countKey: "featureRequests" },
  { label: "Systems", href: "/operations-console/systems", icon: ServerCog, detail: "Storage, email, cron, integrations, and deployment checks." },
];

export function OperationsConsoleNav({ active, counts }: { active: string; counts?: Partial<OperationsConsoleCounts> }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => {
        const Icon = section.icon;
        const selected = active === section.href;
        const badge = section.countKey ? counts?.[section.countKey] : undefined;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={selected ? "page" : undefined}
            className={`rounded-2xl border p-4 transition hover:border-blue-500 hover:shadow-sm ${selected ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-white"}`}
          >
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-slate-950">{section.label}</p>
                  {typeof badge === "number" && badge > 0 ? (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white shadow-sm" aria-label={`${badge} items need attention`}>
                      {badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{section.detail}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </section>
  );
}
