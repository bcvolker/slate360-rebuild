import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { SW360BottomNav } from "@/components/sw360/SW360BottomNav";
import { SW360Header } from "@/components/sw360/SW360Header";

/**
 * Auth-gated shell for every SW360 screen except /sw360/login — reuses the
 * existing (shared) auth/org backend, no new backend needed. Provides the
 * header + 5-tab bottom nav frame every (shell) screen renders inside.
 */
export default async function SW360ShellLayout({ children }: { children: React.ReactNode }) {
  const context = await resolveServerOrgContext();
  if (!context.user) {
    redirect("/sw360/login");
  }

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SW360Header />
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <SW360BottomNav />
    </div>
  );
}
