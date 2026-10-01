export type VnextGateKind = "client" | "owner";

export type VnextAccessInput = {
  kind: VnextGateKind;
  redirectTo: string;
  user: { id: string } | null | undefined;
  isBetaApproved: boolean;
  canAccessOperationsConsole: boolean;
};

export type VnextAccessDecision =
  | { outcome: "allow" }
  | { outcome: "login"; loginPath: string }
  | { outcome: "pending-verification" }
  | { outcome: "not-found" };

export const VNEXT_PENDING_PATH = "/pending-verification";
export const VNEXT_LOGIN_PATH = "/login";

export function vnextLoginPath(redirectTo: string): string {
  const path = redirectTo || "/vnext/projects";
  return `${VNEXT_LOGIN_PATH}?redirectTo=${encodeURIComponent(path)}`;
}

/**
 * Pure access contract for authenticated vNext routes.
 * Owner access is `canAccessOperationsConsole` only (CEO today). Staff is not broadened here.
 */
export function decideVnextAccess(input: VnextAccessInput): VnextAccessDecision {
  if (!input.user) {
    return { outcome: "login", loginPath: vnextLoginPath(input.redirectTo) };
  }
  if (!input.isBetaApproved) {
    return { outcome: "pending-verification" };
  }
  if (input.kind === "owner" && !input.canAccessOperationsConsole) {
    return { outcome: "not-found" };
  }
  return { outcome: "allow" };
}
