import type { ReactNode } from "react";
import StudioAuthedShell from "@/components/studio-ui/StudioAuthedShell";

export default function SlateDropLayout({ children }: { children: ReactNode }) {
  return <StudioAuthedShell>{children}</StudioAuthedShell>;
}
