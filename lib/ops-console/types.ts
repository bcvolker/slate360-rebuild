// Shared types for the Operations Console. Plain module (no "use client") so it
// can be imported by both the server data loader and the client Zustand store.

export type OpsConsoleTab =
  | "overview"
  | "revenue"
  | "users"
  | "plans"
  | "feedback"
  | "staff"
  | "content"
  | "health";

export interface OpsOverview {
  totalOrgs: number;
  totalUsers: number;
  /** tier slug -> org count */
  tierBreakdown: Record<string, number>;
}

export interface OpsCounts {
  pendingAccess: number;
  newFeedback: number;
  featureRequests: number;
  openFeedback: number;
}

export interface OpsSubscriber {
  id: string;
  email: string;
  displayName: string;
  orgName: string;
  tier: string;
  role: string;
}

export interface OpsFeedbackItem {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string;
  severity: string | null;
  createdAt: string;
}

export interface OpsPendingUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface OpsStaffGrant {
  id: string;
  email: string;
  displayName: string | null;
  accessScope: string[];
  grantedAt: string;
  revokedAt: string | null;
}

/** Server-computed integration health (booleans only — no secret values leak). */
export interface OpsHealth {
  stripe: boolean;
  stripeWebhook: boolean;
  supabase: boolean;
  supabaseService: boolean;
  appUrl: boolean;
}

/** Initial payload rendered by the server page and used to seed the store. */
export interface OpsConsoleInitialData {
  isCeo: boolean;
  counts: OpsCounts;
  overview: OpsOverview | null; // CEO only
  feedback: OpsFeedbackItem[]; // staff + CEO
  pendingUsers: OpsPendingUser[]; // staff + CEO
  staff: OpsStaffGrant[]; // CEO only
  health: OpsHealth | null; // CEO only
}

export interface OpsActionItem {
  label: string;
  severity: "info" | "warning" | "critical";
}

export interface ContentAsset {
  id: string;
  placement: string;
  label: string | null;
  url: string;
  updatedAt: string;
}

/** Live revenue snapshot computed from Stripe subscriptions. */
export interface RevenueSnapshot {
  /** false when Stripe isn't configured (no secret key) — UI shows a setup note. */
  configured: boolean;
  /** Monthly recurring revenue in whole dollars (active subs, annual normalized /12). */
  mrr: number;
  /** Annual run-rate (mrr * 12) in whole dollars. */
  arr: number;
  activeSubscribers: number;
  trialingSubscribers: number;
  currency: string;
}
