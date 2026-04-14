import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import CeoCommandCenterClient from "@/components/dashboard/CeoCommandCenterClient";

export const metadata = {
  title: "Operations Console — Slate360",
};

export default async function OperationsConsolePage() {
  // Protection chain:
  // 1. (dashboard)/layout.tsx → resolveServerOrgContext() → isBetaApproved check
  // 2. This page → resolveServerOrgContext() (cache hit) → canAccessOperationsConsole check
  // Non-owners get notFound() even if beta-approved.
  const { user, tier, isSlateCeo, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  // Operations Console is a Slate360 platform-admin tab — NOT a subscription tier feature.
  // Access remains exclusive to the owner account.
  if (!canAccessOperationsConsole) {
    notFound();
  }

  return (
    <CeoCommandCenterClient
      user={{
        name: user.user_metadata?.full_name ?? user.email ?? "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url,
      }}
      tier={tier}
      isCeo={isSlateCeo}
      internalAccess={{ operationsConsole: canAccessOperationsConsole }}
    />
  );
}
