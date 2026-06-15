import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

export const metadata = {
  title: "Operations Console — Slate360",
};

export default async function OperationsConsolePage() {
  const { user, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!canAccessOperationsConsole) notFound();

  return (
    <div className={t.page} data-mobile-route="platform">
      <header className={t.header}>
        <div>
          <p className={t.eyebrow}>Operations Console</p>
          <h1 className={t.title}>Internal tools</h1>
          <p className={t.subtitle}>Staff-only workspaces for Slate360 operations</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/operations-console/feedback"
          className={`${t.card} transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]`}
        >
          <p className={t.eyebrow}>Feedback</p>
          <h2 className="mt-2 text-lg font-semibold text-[var(--graphite-text-header)]">
            Beta feedback queue
          </h2>
          <p className="mt-2 text-sm text-[var(--graphite-muted)]">
            Review in-app issue reports and suggestions.
          </p>
        </Link>
      </div>
    </div>
  );
}
