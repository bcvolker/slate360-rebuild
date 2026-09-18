import type { ReactNode } from "react";
import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";

export default function VnextOpsLayout({ children }: { children: ReactNode }) {
  return <VnextOwnerShell>{children}</VnextOwnerShell>;
}
