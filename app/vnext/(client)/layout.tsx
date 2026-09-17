import type { ReactNode } from "react";
import { VnextClientShell } from "@/components/vnext/VnextClientShell";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

export default async function VnextClientLayout({ children }: { children: ReactNode }) {
  await requireVnextSession("/vnext/projects");
  return <VnextClientShell>{children}</VnextClientShell>;
}
