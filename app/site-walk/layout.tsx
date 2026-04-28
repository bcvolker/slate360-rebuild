import type { ReactNode } from "react";
import type { Metadata } from "next";
import AuthedAppShell from "@/components/dashboard/AuthedAppShell";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { SiteWalkShell } from "@/components/site-walk/SiteWalkShell";

export const metadata: Metadata = {
  title: "Site Walk — Slate360",
  description: "Field capture, plan walks, and deliverables for construction teams.",
};

export default async function SiteWalkLayout({ children }: { children: ReactNode }) {
  const context = await resolveServerOrgContext();
  const initials = getInitials(context.user?.user_metadata?.full_name, context.user?.email);
  return (
    <AuthedAppShell>
      <SiteWalkShell userInitials={initials} orgName={context.orgName}>{children}</SiteWalkShell>
    </AuthedAppShell>
  );
}

function getInitials(name?: unknown, email?: string | null) {
  const source = typeof name === "string" && name.trim() ? name : email ?? "SW";
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SW";
}
