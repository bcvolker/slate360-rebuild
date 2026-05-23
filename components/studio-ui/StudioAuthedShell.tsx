import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";

/**
 * Canonical authenticated layout wrapper after legacy dashboard shell quarantine.
 * Site Walk and module routes supply their own mobile chrome where needed.
 */
export default async function StudioAuthedShell({ children }: { children: ReactNode }) {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login");

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-hidden bg-[#0B0F15] text-[#F8FAFC]">
      {children}
    </div>
  );
}
