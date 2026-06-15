import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

export const metadata = {
  title: "Thermal Studio — Slate360",
};

export default async function ThermalStudioLayout({ children }: { children: React.ReactNode }) {
  // Standalone CEO-only app — NOT part of the Operations Console. Visible only to the owner.
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isSlateCeo) notFound();

  return (
    <div className={t.page} data-mobile-route="platform">
      <header className={t.header}>
        <div>
          <p className={t.eyebrow}>Thermal Studio</p>
          <h1 className={t.title}>Thermal Analysis</h1>
          <p className={t.subtitle}>Private radiometric inspection workspace</p>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link href="/thermal-studio" className={t.secondaryButton}>
            Sessions
          </Link>
          <Link href="/thermal-studio/upload" className={t.primaryButton}>
            New upload
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
