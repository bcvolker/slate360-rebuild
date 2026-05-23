import type { ReactNode } from "react";
import type { Metadata } from "next";
import StudioAuthedShell from "@/components/studio-ui/StudioAuthedShell";

export const metadata: Metadata = {
  title: "Site Walk — Slate360",
  description: "Field capture, plan walks, and deliverables for construction teams.",
};

export default function SiteWalkLayout({ children }: { children: ReactNode }) {
  return <StudioAuthedShell>{children}</StudioAuthedShell>;
}
