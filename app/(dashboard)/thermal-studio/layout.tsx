import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";

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
      {/* Thin top bar (Design Studio pattern) — keep chrome minimal so the workspace
          gets maximum height. */}
      <header className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <h1 className="text-base font-bold text-[var(--graphite-text-header)]">Thermal Studio</h1>
        <nav className="flex items-center gap-2 text-xs font-semibold">
          <Link href="/thermal-studio" className="rounded-lg border border-[var(--mobile-app-card-border)] px-2.5 py-1 text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)]">
            Sessions
          </Link>
          <Link href="/thermal-studio/upload" className="rounded-lg bg-[var(--graphite-primary)] px-2.5 py-1 text-[var(--graphite-canvas)]">
            New upload
          </Link>
        </nav>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
