"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import type { WidgetRendererContext } from "@/components/dashboard/DashboardWidgetRenderer";
import type {
  DashboardContact as Contact,
  DashboardWidgetsPayload,
  DashboardDeployInfo as DeployInfoPayload,
} from "@/lib/types/dashboard";

import { useBillingState } from "./useBillingState";
import { useWidgetPrefsState } from "./useWidgetPrefsState";
import { useAccountState } from "./useAccountState";
import { useWeatherState } from "./useWeatherState";
import { useSuggestFeatureState } from "./useSuggestFeatureState";
import { useNotificationsState } from "./useNotificationsState";

export interface DashboardProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isSlateCeo?: boolean;
  isSlateStaff?: boolean;
  canAccessCeo?: boolean;
  canAccessMarket?: boolean;
  canAccessAthlete360?: boolean;
}

function parseWidgetsPayload(data: Record<string, unknown>): DashboardWidgetsPayload {
  return {
    projects: Array.isArray(data.projects) ? data.projects : [],
    jobs: Array.isArray(data.jobs) ? data.jobs : [],
    financial: Array.isArray(data.financial) ? data.financial : [],
    continueWorking: Array.isArray(data.continueWorking) ? data.continueWorking : [],
    seats: Array.isArray(data.seats) ? data.seats : [],
    contacts: Array.isArray(data.contacts) ? data.contacts : [],
  };
}

export function useDashboardState({
  user,
  tier,
  isSlateCeo = false,
  canAccessCeo = false,
  canAccessMarket = false,
  canAccessAthlete360 = false,
}: DashboardProps) {
  const ent = getEntitlements(tier, { isSlateCeo });
  const supabase = createClient();

  const [isClient, setIsClient] = useState(false);

  const internalAccess = {
    ceo: canAccessCeo,
    market: canAccessMarket,
    athlete360: canAccessAthlete360,
  };

  /* ── Sub-hooks ── */
  const billing = useBillingState(ent);
  const widgetPrefsHook = useWidgetPrefsState(supabase, ent);
  const weather = useWeatherState();
  const suggest = useSuggestFeatureState();
  const notifications = useNotificationsState(supabase);

  /* ── Core UI state ── */
  const [selectedProject, setSelectedProject] = useState("all");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useQueryState("tab", parseAsString.withDefault("overview"));
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [wizardCreating, setWizardCreating] = useState(false);

  const account = useAccountState({
    supabase,
    activeTab: activeTab ?? "overview",
    setBillingNotice: billing.setBillingNotice,
  });

  /* ── Data payloads ── */
  const [dashboardSummary, setDashboardSummary] = useState<{ recentFiles: unknown[]; storageUsed: number } | null>(null);
  const [widgetsData, setWidgetsData] = useState<DashboardWidgetsPayload | null>(null);
  const [deployInfo, setDeployInfo] = useState<DeployInfoPayload | null>(null);

  /* ── SlateDrop / widget popout ── */
  const [slateDropOpen, setSlateDropOpen] = useState(false);
  const [widgetPopoutId, setWidgetPopoutId] = useState<string | null>(null);

  /* ── Refs ── */
  const carouselRef = useRef<HTMLDivElement>(null);

  /* ================================================================
     EFFECTS
     ================================================================ */

  // Hydration guard
  useEffect(() => { setIsClient(true); }, []);

  // Fetch dashboard data on mount
  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((res) => res.json())
      .then((data) => { if (!data.error) setDashboardSummary(data); })
      .catch(console.error);

    fetch("/api/account/overview")
      .then((res) => res.json())
      .then((data) => { if (!data.error) account.setAccountOverview(data); })
      .catch(console.error);

    fetch("/api/deploy-info", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => { if (!data?.error) setDeployInfo(data as DeployInfoPayload); })
      .catch(() => { setDeployInfo(null); });

    fetch("/api/dashboard/widgets", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => { if (!data.error) setWidgetsData(parseWidgetsPayload(data)); })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSlateDrop() {
    setSlateDropOpen(true);
  }

  const scrollCarousel = useCallback((dir: number) => {
    carouselRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }, []);

  const handleCreateProject = useCallback(async (payload: Record<string, unknown>) => {
    setWizardCreating(true);
    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setCreateWizardOpen(false);
        fetch("/api/dashboard/widgets", { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => { if (!d.error) setWidgetsData(parseWidgetsPayload(d)); })
          .catch(console.error);
      }
    } finally {
      setWizardCreating(false);
    }
  }, []);

  const liveContacts: Contact[] = widgetsData?.contacts ?? [];
  const liveProjects = widgetsData?.projects ?? [];
  const liveJobs = widgetsData?.jobs ?? [];
  const liveFinancial = widgetsData?.financial ?? [];
  const liveContinueWorking = widgetsData?.continueWorking ?? [];
  const liveSeatMembers = widgetsData?.seats ?? [];

  const creditsUsed = account.accountOverview?.billing?.purchasedCredits ?? 0;
  const storageUsed = dashboardSummary
    ? Number((dashboardSummary.storageUsed / (1024 * 1024 * 1024)).toFixed(2))
    : (ent.tier === "trial" ? 1.2 : ent.tier === "standard" ? 12 : 45);

  const financialMax = Math.max(1, ...liveFinancial.map((f) => f.credits));

  const widgetCtx: WidgetRendererContext = useMemo(() => ({
    user, tier,
    entitlements: { maxCredits: ent.maxCredits, maxStorageGB: ent.maxStorageGB, maxSeats: ent.maxSeats, label: ent.label, canViewSlateDropWidget: ent.canViewSlateDropWidget, canManageSeats: ent.canManageSeats },
    userCoords: weather.userCoords, liveWeather: weather.liveWeather, liveSeatMembers, liveContacts, liveProjects, liveJobs, liveFinancial, liveContinueWorking,
    creditsUsed, storageUsed, financialMax,
    billingBusy: billing.billingBusy, billingError: billing.billingError, handleBuyCredits: billing.handleBuyCredits, handleUpgradePlan: billing.handleUpgradePlan,
    suggestTitle: suggest.suggestTitle, suggestDesc: suggest.suggestDesc,
    suggestPriority: suggest.suggestPriority, suggestLoading: suggest.suggestLoading, suggestDone: suggest.suggestDone,
    setSuggestTitle: suggest.setSuggestTitle, setSuggestDesc: suggest.setSuggestDesc,
    setSuggestPriority: suggest.setSuggestPriority, handleSuggestFeature: suggest.handleSuggestFeature,
    weatherLogged: weather.weatherLogged, setWeatherLogged: weather.setWeatherLogged,
    setWidgetPrefs: widgetPrefsHook.setWidgetPrefs, setPrefsDirty: widgetPrefsHook.setPrefsDirty,
  }), [
    user, tier, ent, weather.userCoords, weather.liveWeather, liveSeatMembers, liveContacts,
    liveProjects, liveJobs, liveFinancial, liveContinueWorking, creditsUsed,
    storageUsed, financialMax, billing.billingBusy, billing.billingError, billing.handleBuyCredits,
    billing.handleUpgradePlan, suggest.suggestTitle, suggest.suggestDesc, suggest.suggestPriority, suggest.suggestLoading,
    suggest.suggestDone, suggest.handleSuggestFeature, weather.weatherLogged, weather.setWeatherLogged,
    widgetPrefsHook.setWidgetPrefs, widgetPrefsHook.setPrefsDirty,
  ]);

  return {
    // Auth / entitlements
    ent,
    internalAccess,
    isClient,

    // Tab state
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,

    // Project state
    selectedProject, setSelectedProject,
    projectDropdownOpen, setProjectDropdownOpen,
    createWizardOpen, setCreateWizardOpen,
    wizardCreating,
    handleCreateProject,

    // Sub-hook spreads (widget prefs, billing, account, weather, suggest, notifications)
    ...widgetPrefsHook,
    customizeOpen, setCustomizeOpen,
    ...billing,
    ...account,
    ...weather,
    ...suggest,
    ...notifications,

    // Data payloads
    widgetsData, setWidgetsData,
    deployInfo,
    storageUsed,
    creditsUsed,

    // Derived
    liveContacts,
    liveProjects,
    liveJobs,
    liveFinancial,
    liveContinueWorking,
    liveSeatMembers,
    financialMax,
    widgetCtx,

    // SlateDrop
    slateDropOpen, setSlateDropOpen,
    openSlateDrop,

    // Widget popout
    widgetPopoutId, setWidgetPopoutId,

    // Refs
    carouselRef,
    scrollCarousel,
  };
}

export type DashboardState = ReturnType<typeof useDashboardState>;
