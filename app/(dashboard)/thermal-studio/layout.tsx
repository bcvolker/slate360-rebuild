import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

export const metadata = {
  title: "Thermal Studio",
};

export default async function ThermalOpsLayout({ children }: { children: React.ReactNode }) {
  // Thermal Studio is CEO-only — staff with Operations Console access must NOT reach it.
  const { user, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isSlateCeo) notFound();

    // Height-bound the whole chain so the session workspace can fit the screen with
    // NO page scroll (its internal regions scroll instead). The dashboard content
    // area is overflow-y-auto, so this wrapper must be h-full + a flex column down
    // to the children — otherwise the page grows to natural height and scrolls.
  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4 py-3 lg:px-0"
      data-mobile-route="platform"
    >
      <header className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={t.title}>Thermal Studio</h1>
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
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
