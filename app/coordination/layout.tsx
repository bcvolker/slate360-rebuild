import type { ReactNode } from "react";
import type { Metadata } from "next";
import StudioAuthedShell from "@/components/studio-ui/StudioAuthedShell";

export const metadata: Metadata = {
  title: "Coordination — Slate360",
};

export default function CoordinationLayout({ children }: { children: ReactNode }) {
  return <StudioAuthedShell>{children}</StudioAuthedShell>;
}
