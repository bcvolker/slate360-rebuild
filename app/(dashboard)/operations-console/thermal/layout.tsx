import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

export const metadata = {
  title: "Thermal Analysis — Operations Console",
};

export default async function ThermalOpsLayout({ children }: { children: React.ReactNode }) {
  const { user, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!canAccessOperationsConsole) notFound();

  return (
    <div className={t.page} data-mobile-route="platform">
      <header className={t.header}>
        <div>
          <p className={t.eyebrow}>Operations Console</p>
          <h1 className={t.title}>Thermal Analysis</h1>
          <p className={t.subtitle}>Private radiometric inspection workspace</p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link href="/operations-console/thermal" className={t.secondaryButton}>
            Sessions
          </Link>
          <Link href="/operations-console/thermal/upload" className={t.primaryButton}>
            New upload
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
