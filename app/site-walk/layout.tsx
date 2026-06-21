import type { ReactNode } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { buildInviteShareData } from "@/lib/server/invite-share-data";
import { StudioAppShell } from "@/components/studio-ui/StudioAppShell";

export const metadata: Metadata = {
  title: "Site Walk — Slate360",
  description: "Field capture, walks with drawings, and deliverables for construction teams.",
};

export default async function SiteWalkLayout({ children }: { children: ReactNode }) {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login");

  const userName =
    (ctx.user.user_metadata?.name as string | undefined) ??
    ctx.user.email ??
    "";

  const inviteShareData = await buildInviteShareData(ctx.user, ctx.orgId);

  return (
    <StudioAppShell
      userName={userName}
      workspaceName={ctx.orgName ?? "Slate360"}
      inviteShareData={inviteShareData}
    >
      {children}
    </StudioAppShell>
  );
}
