import type { ReactNode } from "react";
import { VnextOwnerShell } from "@/components/vnext/VnextOwnerShell";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";

export default async function VnextOpsLayout({ children }: { children: ReactNode }) {
  await requireVnextOwner();
  return <VnextOwnerShell>{children}</VnextOwnerShell>;
}
