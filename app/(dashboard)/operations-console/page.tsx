import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import OperationsConsoleClient from "@/components/dashboard/OperationsConsoleClient";

export const metadata = {
  title: "Operations Console — Slate360",
};

export default async function OperationsConsolePage() {
  // Protection chain:
  // 1. (dashboard)/layout.tsx → resolveServerOrgContext() → isBetaApproved check
  // 2. This page → resolveServerOrgContext() (cache hit) → canAccessOperationsConsole check
  // Non-owners get notFound() even if beta-approved.
  const { user, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  // Operations Console is a Slate360 platform-admin tab — NOT a subscription tier feature.
  // Access remains exclusive to the owner account.
  if (!canAccessOperationsConsole) {
    notFound();
  }

  return <OperationsConsoleClient ownerEmail={user.email ?? ""} />;
}
