import type { ReactNode } from "react";
import { VnextClientShell } from "@/components/vnext/VnextClientShell";

export default function VnextClientLayout({ children }: { children: ReactNode }) {
  return <VnextClientShell>{children}</VnextClientShell>;
}
