import "server-only";

import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { decideVnextAccess, VNEXT_PENDING_PATH, type VnextGateKind } from "@/lib/vnext/access";

async function enforceVnextAccess(kind: VnextGateKind, redirectTo: string) {
  const ctx = await resolveServerOrgContext();
  const decision = decideVnextAccess({
    kind,
    redirectTo,
    user: ctx.user,
    isBetaApproved: ctx.isBetaApproved,
    canAccessOperationsConsole: ctx.canAccessOperationsConsole,
  });

  if (decision.outcome === "login") redirect(decision.loginPath);
  if (decision.outcome === "pending-verification") redirect(VNEXT_PENDING_PATH);
  if (decision.outcome === "not-found") notFound();
  return ctx;
}

export async function requireVnextSession(redirectTo = "/vnext/projects") {
  return enforceVnextAccess("client", redirectTo);
}

export async function requireVnextOwner(redirectTo = "/vnext/ops") {
  return enforceVnextAccess("owner", redirectTo);
}
