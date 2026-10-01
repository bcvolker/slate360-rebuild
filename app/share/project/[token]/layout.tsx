import type { ReactNode } from "react";
import { VnextShareEntryBeacon } from "@/components/vnext/share/VnextShareEntryBeacon";

export default async function PublicShareLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      <VnextShareEntryBeacon token={token} />
      {children}
    </>
  );
}
