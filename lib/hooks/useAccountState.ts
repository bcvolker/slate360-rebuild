"use client";

import { useState, useCallback, useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";

interface UseAccountStateOptions {
  supabase: SupabaseClient;
  activeTab: string;
  setBillingNotice: (notice: { ok: boolean; text: string } | null) => void;
}

export function useAccountState({ supabase, activeTab, setBillingNotice }: UseAccountStateOptions) {
  /* ── Account overview ── */
  const [accountOverview, setAccountOverview] = useState<DashboardAccountOverview | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  /* ── API keys ── */
  const [apiKeyLabel, setApiKeyLabel] = useState("");
  const [apiKeyBusy, setApiKeyBusy] = useState<"create" | string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);

  /* ── Preferences ── */
  const [prefTheme, setPrefTheme] = useState<"light" | "dark" | "system">("system");
  const [prefStartTab, setPrefStartTab] = useState("overview");
  const [prefNotification, setPrefNotification] = useState<"off" | "daily" | "weekly">("daily");
  const [prefImportantAlerts, setPrefImportantAlerts] = useState(true);
  const [prefShowDashboardTiles, setPrefShowDashboardTiles] = useState(true);

  const loadAccountOverview = useCallback(async () => {
    setAccountLoading(true);
    setAccountError(null);
    try {
      const res = await fetch("/api/account/overview", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Unable to load account data");
      setAccountOverview(data as DashboardAccountOverview);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : "Unable to load account data");
    } finally {
      setAccountLoading(false);
    }
  }, []);

  // Load account data on my-account tab
  useEffect(() => {
    if (activeTab === "my-account") {
      void loadAccountOverview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const copyText = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setBillingNotice({ ok: true, text: `${label} copied` });
      setTimeout(() => setBillingNotice(null), 2500);
    } catch {
      setBillingNotice({ ok: false, text: `Unable to copy ${label.toLowerCase()}` });
      setTimeout(() => setBillingNotice(null), 2500);
    }
  }, [setBillingNotice]);

  const applyLayoutPreset = useCallback(async (preset: "simple" | "creator" | "project") => {
    const mappedTab = preset === "creator" ? "content-studio" : preset === "project" ? "project-hub" : "overview";
    try {
      await supabase.auth.updateUser({ data: { dashboardPreset: preset, defaultTab: mappedTab } });
      setBillingNotice({ ok: true, text: `${preset.charAt(0).toUpperCase() + preset.slice(1)} view saved.` });
    } catch {
      setBillingNotice({ ok: false, text: "Could not save preset" });
    }
  }, [supabase, setBillingNotice]);

  const handleGenerateApiKey = useCallback(async () => {
    setApiKeyError(null);
    setGeneratedApiKey(null);
    setApiKeyBusy("create");
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: apiKeyLabel.trim() || "General Key" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create API key");
      setGeneratedApiKey(data?.key?.raw ?? null);
      setApiKeyLabel("");
      await loadAccountOverview();
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to create API key");
    } finally {
      setApiKeyBusy(null);
    }
  }, [apiKeyLabel, loadAccountOverview]);

  const handleRevokeApiKey = useCallback(async (id: string) => {
    setApiKeyError(null);
    setApiKeyBusy(id);
    try {
      const res = await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to revoke API key");
      await loadAccountOverview();
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to revoke API key");
    } finally {
      setApiKeyBusy(null);
    }
  }, [loadAccountOverview]);

  const saveAccountPreferences = useCallback(async () => {
    try {
      await supabase.auth.updateUser({
        data: {
          theme: prefTheme,
          defaultTab: prefStartTab,
          notificationFrequency: prefNotification,
          importantAlerts: prefImportantAlerts,
          showDashboardTiles: prefShowDashboardTiles,
        },
      });
      setBillingNotice({ ok: true, text: "Preferences saved." });
      setTimeout(() => setBillingNotice(null), 2200);
    } catch {
      setBillingNotice({ ok: false, text: "Could not save preferences" });
      setTimeout(() => setBillingNotice(null), 2200);
    }
  }, [supabase, prefTheme, prefStartTab, prefNotification, prefImportantAlerts, prefShowDashboardTiles, setBillingNotice]);

  return {
    accountOverview, setAccountOverview,
    accountLoading,
    accountError,
    loadAccountOverview,

    apiKeyLabel, setApiKeyLabel,
    apiKeyBusy,
    apiKeyError,
    generatedApiKey,
    handleGenerateApiKey,
    handleRevokeApiKey,

    prefTheme, setPrefTheme,
    prefStartTab, setPrefStartTab,
    prefNotification, setPrefNotification,
    prefImportantAlerts, setPrefImportantAlerts,
    prefShowDashboardTiles, setPrefShowDashboardTiles,
    saveAccountPreferences,
    applyLayoutPreset,
    copyText,
  };
}
