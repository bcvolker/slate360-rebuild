import type { ReactNode } from "react";
import type { Metadata } from "next";
import AuthedAppShell from "@/components/dashboard/AuthedAppShell";
import { SiteWalkShell } from "@/components/site-walk/SiteWalkShell";

export const metadata: Metadata = {
  title: "Site Walk — Slate360",
  description: "Field capture, plan walks, and deliverables for construction teams.",
};

export default function SiteWalkLayout({ children }: { children: ReactNode }) {
  return (
    <AuthedAppShell>
      <SiteWalkShell>{children}</SiteWalkShell>
    </AuthedAppShell>
  );
}
