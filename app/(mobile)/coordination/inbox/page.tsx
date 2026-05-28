import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MobileInboxClient } from "@/components/mobile-system/MobileInboxClient";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "Inbox — Slate360" };
export const dynamic = "force-dynamic";

export default async function CoordinationInboxPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/coordination/inbox");

  return (
    <Suspense fallback={null}>
      <MobileInboxClient />
    </Suspense>
  );
}
