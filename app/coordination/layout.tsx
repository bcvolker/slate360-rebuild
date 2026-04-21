import type { ReactNode } from "react";
import type { Metadata } from "next";
import AuthedAppShell from "@/components/dashboard/AuthedAppShell";

export const metadata: Metadata = {
  title: "Coordination — Slate360",
};

export default function CoordinationLayout({ children }: { children: ReactNode }) {
  return <AuthedAppShell>{children}</AuthedAppShell>;
}
