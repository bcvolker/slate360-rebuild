import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

/**
 * CEO Dashboard chrome. This route stays at /operations-console but does not
 * use the dashboard shell, so the desktop catalog (sidebar, Workspace bar,
 * command palette) is not mounted here.
 */
export default async function CeoDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!canAccessOperationsConsole) notFound();

  return (
    <div className="min-h-[100dvh] bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]">
      {children}
    </div>
  );
}
