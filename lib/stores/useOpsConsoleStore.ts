"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  OpsActionItem,
  OpsConsoleInitialData,
  OpsCounts,
  OpsFeedbackItem,
  OpsHealth,
  OpsOverview,
  OpsPendingUser,
  OpsStaffGrant,
  OpsSubscriber,
  OpsConsoleTab,
  RevenueSnapshot,
  ContentAsset,
} from "@/lib/ops-console/types";

interface OpsConsoleState {
  // role + server-seeded data
  isCeo: boolean;
  counts: OpsCounts | null;
  overview: OpsOverview | null;
  feedback: OpsFeedbackItem[];
  pendingUsers: OpsPendingUser[];
  staff: OpsStaffGrant[];
  health: OpsHealth | null;

  // lazily fetched (CEO only)
  subscribers: OpsSubscriber[];
  subscribersLoaded: boolean;
  revenue: RevenueSnapshot | null;
  revenueLoaded: boolean;
  contentAssets: ContentAsset[];
  contentLoaded: boolean;

  // ui (persisted)
  activeTab: OpsConsoleTab;
  cashOnHand: number;
  simFactor: number;

  // transient
  error: string | null;
  busy: boolean;

  // seeding + ui actions
  hydrate: (data: OpsConsoleInitialData) => void;
  setActiveTab: (tab: OpsConsoleTab) => void;
  setCashOnHand: (value: number) => void;
  setSimFactor: (factor: number) => void;
  setError: (value: string | null) => void;

  // derived (revenue is not wired yet → these return null until it is)
  getActionItems: () => OpsActionItem[];

  // async (real endpoints only)
  fetchSubscribers: () => Promise<void>;
  fetchRevenue: () => Promise<void>;
  fetchContent: () => Promise<void>;
  addContent: (input: { placement: string; url: string; label?: string }) => Promise<boolean>;
  removeContent: (assetId: string) => Promise<boolean>;
  grantStaff: (input: { email: string; displayName?: string; accessScope?: string[] }) => Promise<boolean>;
  revokeStaff: (staffId: string) => Promise<boolean>;
  refreshStaff: () => Promise<void>;
  updateFeedbackStatus: (feedbackId: string, status: string) => Promise<boolean>;
  approveUser: (userId: string, approved: boolean) => Promise<boolean>;
}

export const useOpsConsoleStore = create<OpsConsoleState>()(
  persist(
    (set, get) => ({
      isCeo: false,
      counts: null,
      overview: null,
      feedback: [],
      pendingUsers: [],
      staff: [],
      health: null,
      subscribers: [],
      subscribersLoaded: false,
      revenue: null,
      revenueLoaded: false,
      contentAssets: [],
      contentLoaded: false,
      activeTab: "overview",
      cashOnHand: 25000,
      simFactor: 1.0,
      error: null,
      busy: false,

      hydrate: (data) =>
        set({
          isCeo: data.isCeo,
          counts: data.counts,
          overview: data.overview,
          feedback: data.feedback,
          pendingUsers: data.pendingUsers,
          staff: data.staff,
          health: data.health,
          error: null,
        }),

      setActiveTab: (tab) => set({ activeTab: tab }),
      setCashOnHand: (value) => set({ cashOnHand: Number.isFinite(value) ? value : 0 }),
      setSimFactor: (factor) => set({ simFactor: factor }),
      setError: (value) => set({ error: value }),

      getActionItems: () => {
        const items: OpsActionItem[] = [];
        const { counts, health } = get();

        if (health && !health.stripe) {
          items.push({
            label: "Stripe secret key is not set — live billing is disabled until it's configured in Vercel.",
            severity: "critical",
          });
        }
        if (health && health.stripe && !health.stripeWebhook) {
          items.push({
            label: "Stripe webhook secret missing — subscriptions won't activate after checkout.",
            severity: "critical",
          });
        }
        if (counts && counts.pendingAccess > 0) {
          items.push({
            label: `${counts.pendingAccess} account${counts.pendingAccess === 1 ? "" : "s"} awaiting approval.`,
            severity: "warning",
          });
        }
        if (counts && counts.newFeedback > 0) {
          items.push({
            label: `${counts.newFeedback} new feedback item${counts.newFeedback === 1 ? "" : "s"} to triage.`,
            severity: "info",
          });
        }
        if (!items.length) {
          items.push({ label: "Nothing needs attention right now.", severity: "info" });
        }
        return items;
      },

      fetchSubscribers: async () => {
        if (get().subscribersLoaded || !get().isCeo) return;
        try {
          set({ busy: true, error: null });
          const res = await fetch("/api/ceo/subscribers");
          if (!res.ok) throw new Error("Failed to load subscribers");
          const json = (await res.json()) as {
            subscribers?: Array<{
              id: string;
              email: string;
              displayName?: string;
              orgName?: string;
              orgTier?: string;
              orgRole?: string;
            }>;
          };
          const subscribers: OpsSubscriber[] = (json.subscribers ?? []).map((s) => ({
            id: s.id,
            email: s.email,
            displayName: s.displayName ?? s.email,
            orgName: s.orgName ?? "—",
            tier: s.orgTier ?? "trial",
            role: s.orgRole ?? "member",
          }));
          set({ subscribers, subscribersLoaded: true });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to load subscribers" });
        } finally {
          set({ busy: false });
        }
      },

      fetchRevenue: async () => {
        if (get().revenueLoaded || !get().isCeo) return;
        try {
          const res = await fetch("/api/ceo/revenue");
          if (!res.ok) throw new Error("Failed to load revenue");
          const json = (await res.json()) as { revenue?: RevenueSnapshot };
          set({ revenue: json.revenue ?? null });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to load revenue" });
        } finally {
          // Resolve the loading state either way so the UI shows live data or the
          // not-configured note instead of spinning forever.
          set({ revenueLoaded: true });
        }
      },

      fetchContent: async () => {
        if (get().contentLoaded || !get().isCeo) return;
        try {
          const res = await fetch("/api/ceo/content");
          if (!res.ok) throw new Error("Failed to load content assets");
          const json = (await res.json()) as { assets?: ContentAsset[] };
          set({ contentAssets: json.assets ?? [] });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to load content assets" });
        } finally {
          set({ contentLoaded: true });
        }
      },

      addContent: async ({ placement, url, label }) => {
        try {
          set({ busy: true, error: null });
          const res = await fetch("/api/ceo/content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ placement, url, label }),
          });
          const json = (await res.json().catch(() => ({}))) as { asset?: ContentAsset; error?: string };
          if (!res.ok || !json.asset) throw new Error(json.error ?? "Failed to add asset");
          set((state) => ({ contentAssets: [json.asset as ContentAsset, ...state.contentAssets] }));
          return true;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to add asset" });
          return false;
        } finally {
          set({ busy: false });
        }
      },

      removeContent: async (assetId) => {
        try {
          set({ busy: true, error: null });
          const res = await fetch(`/api/ceo/content/${assetId}`, { method: "DELETE" });
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(json.error ?? "Failed to remove asset");
          set((state) => ({ contentAssets: state.contentAssets.filter((a) => a.id !== assetId) }));
          return true;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to remove asset" });
          return false;
        } finally {
          set({ busy: false });
        }
      },

      grantStaff: async ({ email, displayName, accessScope }) => {
        try {
          set({ busy: true, error: null });
          const res = await fetch("/api/ceo/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, displayName, accessScope }),
          });
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(json.error ?? "Failed to grant access");
          await get().refreshStaff();
          return true;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to grant access" });
          return false;
        } finally {
          set({ busy: false });
        }
      },

      revokeStaff: async (staffId) => {
        try {
          set({ busy: true, error: null });
          const res = await fetch(`/api/ceo/staff/${staffId}`, { method: "DELETE" });
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(json.error ?? "Failed to revoke access");
          await get().refreshStaff();
          return true;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to revoke access" });
          return false;
        } finally {
          set({ busy: false });
        }
      },

      refreshStaff: async () => {
        const res = await fetch("/api/ceo/staff");
        if (!res.ok) return;
        const json = (await res.json()) as {
          staff?: Array<{
            id: string;
            email: string;
            display_name?: string | null;
            access_scope?: string[] | null;
            granted_at: string;
            revoked_at?: string | null;
          }>;
        };
        const staff: OpsStaffGrant[] = (json.staff ?? []).map((s) => ({
          id: s.id,
          email: s.email,
          displayName: s.display_name ?? null,
          accessScope: s.access_scope ?? [],
          grantedAt: s.granted_at,
          revokedAt: s.revoked_at ?? null,
        }));
        set({ staff });
      },

      updateFeedbackStatus: async (feedbackId, status) => {
        try {
          set({ busy: true, error: null });
          const res = await fetch(`/api/ops/feedback/${feedbackId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          });
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(json.error ?? "Failed to update feedback");
          set((state) => ({
            feedback: state.feedback.map((f) => (f.id === feedbackId ? { ...f, status } : f)),
          }));
          return true;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to update feedback" });
          return false;
        } finally {
          set({ busy: false });
        }
      },

      approveUser: async (userId, approved) => {
        try {
          set({ busy: true, error: null });
          const res = await fetch("/api/admin/beta", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, approved }),
          });
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(json.error ?? "Failed to update access");
          // Either decision clears the user from the pending-approval queue.
          set((state) => ({
            pendingUsers: state.pendingUsers.filter((u) => u.id !== userId),
            counts: state.counts
              ? { ...state.counts, pendingAccess: Math.max(0, state.counts.pendingAccess - 1) }
              : state.counts,
          }));
          return true;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to update access" });
          return false;
        } finally {
          set({ busy: false });
        }
      },
    }),
    {
      name: "slate360-ops-console",
      // Persist UI state only — never financial data or PII to localStorage.
      partialize: (state) => ({
        activeTab: state.activeTab,
        cashOnHand: state.cashOnHand,
        simFactor: state.simFactor,
      }),
    },
  ),
);
