import "server-only";

import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export async function requireVnextSession(redirectTo = "/vnext/projects") {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) {
    const path = redirectTo ?? "/vnext/projects";
    redirect(`/login?redirectTo=${encodeURIComponent(path)}`);
  }
  if (!ctx.isBetaApproved) {
    redirect("/pending-verification");
  }
  return ctx;
}

export async function requireVnextOwner(redirectTo = "/vnext/ops") {
  const ctx = await requireVnextSession(redirectTo);
  if (!ctx.canAccessOperationsConsole) {
    notFound();
  }
  return ctx;
}
