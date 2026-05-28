import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MobilePlatformLayout } from "@/components/mobile-system/MobilePlatformLayout";
import { buildInviteShareData } from "@/lib/server/invite-share-data";
import { isMobileServerLayout } from "@/lib/server/device-layout";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { requireBetaAccess } from "@/lib/server/beta-access";

export default async function MobileShellLayout({ children }: { children: ReactNode }) {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login");

  await requireBetaAccess(ctx.user);

  const inviteShareData = await buildInviteShareData(ctx.user, ctx.orgId);
  const isMobileDevice = await isMobileServerLayout();

  return (
    <MobilePlatformLayout inviteShareData={inviteShareData} isMobileDevice={isMobileDevice}>
      {children}
    </MobilePlatformLayout>
  );
}
