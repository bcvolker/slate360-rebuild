import type { ReactNode } from "react";
import type { Metadata } from "next";
import AuthedAppShell from "@/components/dashboard/AuthedAppShell";

export const metadata: Metadata = {
  title: "Site Walk — Slate360",
  description: "Field capture and walk-through tool for construction teams",
};

export default function SiteWalkLayout({ children }: { children: ReactNode }) {
  return <AuthedAppShell>{children}</AuthedAppShell>;
}
