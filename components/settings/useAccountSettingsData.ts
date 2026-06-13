"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DashboardAccountOverview } from "@/lib/types/dashboard";
import type { BrandSettings, TeamOverview } from "./settings-types";
import { useSettingsNotifications } from "./useSettingsNotifications";
import { useSettingsProfile } from "./useSettingsProfile";

type UseAccountSettingsDataOptions = {
  userId: string;
  initialName: string;
  initialAvatarUrl?: string | null;
  orgId: string | null;
  canEditOrg: boolean;
};

export function useAccountSettingsData({
  userId,
  initialName,
  initialAvatarUrl,
  orgId,
  canEditOrg,
}: UseAccountSettingsDataOptions) {
  const supabase = createClient();

  const [overview, setOverview] = useState<DashboardAccountOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [brandSettings, setBrandSettings] = useState<BrandSettings>({});
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandBusy, setBrandBusy] = useState(false);

  const [teamOverview, setTeamOverview] = useState<TeamOverview | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const flashStatus = useCallback((ok: boolean, text: string) => {
    setStatusMessage({ ok, text });
    window.setTimeout(() => setStatusMessage(null), 2400);
  }, []);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const res = await fetch("/api/account/overview", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Unable to load account data");
      setOverview(data as DashboardAccountOverview);
    } catch (error) {
      setOverviewError(error instanceof Error ? error.message : "Unable to load account data");
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const profile = useSettingsProfile({
    userId,
    initialName,
    initialAvatarUrl,
    onStatus: flashStatus,
    onProfileSaved: () => void loadOverview(),
  });

  const notifications = useSettingsNotifications({ onStatus: flashStatus });

  const loadBrandSettings = useCallback(async () => {
    if (!orgId || !canEditOrg) return;
    setBrandLoading(true);
    try {
      const res = await fetch("/api/site-walk/branding/settings", { cache: "no-store" });
      const data = (await res.json()) as { brand_settings?: BrandSettings; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unable to load organization settings");
      setBrandSettings(data.brand_settings ?? {});
    } catch (error) {
      flashStatus(false, error instanceof Error ? error.message : "Unable to load organization settings");
    } finally {
      setBrandLoading(false);
    }
  }, [orgId, canEditOrg, flashStatus]);

  const loadTeam = useCallback(async () => {
    if (!orgId) {
      setTeamOverview({ members: [], seatCount: 0, maxSeats: 0 });
      return;
    }
    setTeamLoading(true);
    setTeamError(null);
    try {
      const res = await fetch("/api/org/members", { cache: "no-store" });
      const data = (await res.json()) as TeamOverview & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unable to load team");
      setTeamOverview({
        members: data.members ?? [],
        seatCount: data.seatCount ?? 0,
        maxSeats: data.maxSeats ?? 0,
      });
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Unable to load team");
    } finally {
      setTeamLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadBrandSettings();
  }, [loadBrandSettings]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const saveBrandSettings = useCallback(async () => {
    if (!orgId || !canEditOrg) return;
    setBrandBusy(true);
    try {
      const res = await fetch("/api/site-walk/branding/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandSettings),
      });
      const data = (await res.json()) as { brand_settings?: BrandSettings; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save organization settings");
      setBrandSettings(data.brand_settings ?? brandSettings);
      flashStatus(true, "Branding published.");
    } catch (error) {
      flashStatus(false, error instanceof Error ? error.message : "Could not save organization settings.");
    } finally {
      setBrandBusy(false);
    }
  }, [orgId, canEditOrg, brandSettings, flashStatus]);

  const uploadBrandAsset = useCallback(
    async (file: File, type: "logo" | "signature") => {
      if (!orgId || !canEditOrg) return;
      setBrandBusy(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("type", type);
        const res = await fetch("/api/site-walk/branding", { method: "POST", body: formData });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? `Could not upload ${type}`);
        const key = type === "logo" ? "logo_url" : "signature_url";
        setBrandSettings((current) => ({ ...current, [key]: data.url ?? "" }));
        flashStatus(true, `${type === "logo" ? "Logo" : "Signature"} uploaded. Publish to apply other edits.`);
      } catch (error) {
        flashStatus(false, error instanceof Error ? error.message : `Could not upload ${type}.`);
      } finally {
        setBrandBusy(false);
      }
    },
    [orgId, canEditOrg, flashStatus],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      flashStatus(true, "Password updated.");
    },
    [supabase, flashStatus],
  );

  return {
    overview,
    overviewLoading,
    overviewError,
    loadOverview,
    ...profile,
    ...notifications,
    brandSettings,
    setBrandSettings,
    brandLoading,
    brandBusy,
    saveBrandSettings,
    uploadBrandAsset,
    updatePassword,
    teamOverview,
    teamLoading,
    teamError,
    loadTeam,
    statusMessage,
  };
}
