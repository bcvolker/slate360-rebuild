import type { ReactNode } from "react";
import AuthedAppShell from "@/components/dashboard/AuthedAppShell";

export default function SlateDropLayout({ children }: { children: ReactNode }) {
  return <AuthedAppShell>{children}</AuthedAppShell>;
}
