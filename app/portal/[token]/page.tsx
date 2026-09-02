import { Suspense } from "react";
import { PortalClient } from "@/components/portal/PortalClient";

export const dynamic = "force-dynamic";

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <Suspense>
      <PortalClient token={token} />
    </Suspense>
  );
}
