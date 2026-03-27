"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import type { WidgetRendererContext } from "@/components/dashboard/DashboardWidgetRenderer";
import {
  WIDGET_META,
  type WidgetPref,
  type WidgetSize,
  buildDefaultPrefs,
  DASHBOARD_STORAGE_KEY,
} from "@/lib/widgets/widget-meta";
import {
  loadWidgetPrefs,
  mergeWidgetPrefs,
  saveWidgetPrefs,
  WIDGET_PREFS_SCHEMA_VERSION,
} from "@/lib/widgets/widget-prefs-storage";
import type {
  DashboardProject as Project,
  DashboardContact as Contact,
  LiveWeatherState,
  DashboardWidgetsPayload,
  DashboardDeployInfo as DeployInfoPayload,
  DashboardInboxNotification as InboxNotification,
  DashboardAccountOverview,
} from "@/lib/types/dashboard";

/* ================================================================
   TYPES
   ================================================================ */

export interface DashboardProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isSlateCeo?: boolean;
  isSlateStaff?: boolean;
  canAccessCeo?: boolean;
  canAccessMarket?: boolean;
  canAccessAthlete360?: boolean;
}

const DEFAULT_WIDGET_PREFS: WidgetPref[] = buildDefaultPrefs({ expandedIds: ["calendar", "seats"] });

/* ================================================================
   HOOK
   ================================================================ */

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

  /* ── Core UI state ── */
  const [selectedProject, setSelectedProject] = useState("all");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useQueryState("tab", parseAsString.withDefault("overview"));
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [wizardCreating, setWizardCreating] = useState(false);

  /* ── Widget prefs ── */
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(DEFAULT_WIDGET_PREFS);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [dashDragIdx, setDashDragIdx] = useState<number | null>(null);

  /* ── Billing ── */
  const [billingBusy, setBillingBusy] = useState<"portal" | "credits" | "upgrade" | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingNotice, setBillingNotice] = useState<{ ok: boolean; text: string } | null>(null);

  /* ── Account ── */
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

  /* ── Suggest feature ── */
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestDesc, setSuggestDesc] = useState("");
  const [suggestPriority, setSuggestPriority] = useState<"low" | "medium" | "high">("medium");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestDone, setSuggestDone] = useState(false);

  /* ── Weather ── */
  const [weatherLogged, setWeatherLogged] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherState | null>(null);

  /* ── Notifications ── */
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<InboxNotification[]>([]);

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

  // Hydration guard + sync widget prefs from localStorage
  useEffect(() => {
    setIsClient(true);
    const storedPrefs = loadWidgetPrefs(DASHBOARD_STORAGE_KEY, DEFAULT_WIDGET_PREFS);
    setWidgetPrefs(storedPrefs);
  }, []);

  // Load saved prefs from Supabase user metadata + fetch dashboard data
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      const saved = u?.user_metadata?.dashboardWidgets as WidgetPref[] | undefined;
      const savedVersion = Number(u?.user_metadata?.dashboardWidgetsVersion ?? 0);
      if (savedVersion === WIDGET_PREFS_SCHEMA_VERSION && saved && Array.isArray(saved) && saved.length > 0) {
        const merged = mergeWidgetPrefs(DEFAULT_WIDGET_PREFS, saved);
        setWidgetPrefs(merged);
        saveWidgetPrefs(DASHBOARD_STORAGE_KEY, merged);
      }
    });

    fetch("/api/dashboard/summary")
      .then((res) => res.json())
      .then((data) => { if (!data.error) setDashboardSummary(data); })
      .catch(console.error);

    fetch("/api/account/overview")
      .then((res) => res.json())
      .then((data) => { if (!data.error) setAccountOverview(data); })
      .catch(console.error);

    fetch("/api/deploy-info", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => { if (!data?.error) setDeployInfo(data as DeployInfoPayload); })
      .catch(() => { setDeployInfo(null); });

    fetch("/api/dashboard/widgets", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setWidgetsData({
            projects: Array.isArray(data.projects) ? data.projects : [],
            jobs: Array.isArray(data.jobs) ? data.jobs : [],
            financial: Array.isArray(data.financial) ? data.financial : [],
            continueWorking: Array.isArray(data.continueWorking) ? data.continueWorking : [],
            seats: Array.isArray(data.seats) ? data.seats : [],
            contacts: Array.isArray(data.contacts) ? data.contacts : [],
          });
        }
      })
      .catch(console.error);
  }, [supabase]);

  // Geolocation + weather
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });

        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=5&timezone=auto`),
            fetch(`/api/weather/reverse-geocode?lat=${lat}&lng=${lng}`),
          ]);

          if (!weatherRes.ok) return;

          const weatherJson = await weatherRes.json();
          const geoJson = geoRes.ok ? await geoRes.json() : null;

          const weatherCodeToIcon = (code: number): "sun" | "cloud-sun" | "cloud" | "rain" | "snow" => {
            if ([0].includes(code)) return "sun";
            if ([1, 2].includes(code)) return "cloud-sun";
            if ([3, 45, 48].includes(code)) return "cloud";
            if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
            return "rain";
          };

          const weatherCodeToCondition = (code: number): string => {
            if (code === 0) return "Clear";
            if ([1, 2].includes(code)) return "Partly Cloudy";
            if ([3, 45, 48].includes(code)) return "Cloudy";
            if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
            return "Rain";
          };

          const dailyCodes = weatherJson?.daily?.weather_code ?? [];
          const dailyMax = weatherJson?.daily?.temperature_2m_max ?? [];
          const dailyMin = weatherJson?.daily?.temperature_2m_min ?? [];
          const dailyPrecip = weatherJson?.daily?.precipitation_probability_max ?? [];

          const forecast = (weatherJson?.daily?.time ?? []).slice(0, 5).map((dateStr: string, index: number) => {
            const day = new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
            return {
              day,
              hi: Math.round(Number(dailyMax[index] ?? 0) * 9 / 5 + 32),
              lo: Math.round(Number(dailyMin[index] ?? 0) * 9 / 5 + 32),
              icon: weatherCodeToIcon(Number(dailyCodes[index] ?? 1)),
              precip: Number(dailyPrecip[index] ?? 0),
            };
          });

          const locationName = geoJson?.results?.[0]
            ? `${geoJson.results[0].name}${geoJson.results[0].admin1 ? `, ${geoJson.results[0].admin1}` : ""}`
            : `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

          const currentCode = Number(weatherJson?.current?.weather_code ?? 1);
          const humidity = Number(weatherJson?.current?.relative_humidity_2m ?? 0);
          const windMph = Number(weatherJson?.current?.wind_speed_10m ?? 0) * 0.621371;

          const alerts: LiveWeatherState["constructionAlerts"] = [];
          if (windMph >= 20) alerts.push({ message: `High wind risk (${Math.round(windMph)} mph) — review crane operations`, severity: "warning" });
          if (forecast.some((f: { precip: number }) => f.precip >= 50)) alerts.push({ message: "High precipitation chance in the next 5 days — protect exposed work areas", severity: "caution" });
          if (alerts.length === 0) alerts.push({ message: "No major weather construction risks detected", severity: "info" });

          setLiveWeather({
            location: locationName,
            current: {
              temp: Math.round(Number(weatherJson?.current?.temperature_2m ?? 0) * 9 / 5 + 32),
              condition: weatherCodeToCondition(currentCode),
              humidity,
              wind: Math.round(windMph),
              icon: weatherCodeToIcon(currentCode),
            },
            forecast,
            constructionAlerts: alerts,
          });
        } catch {
          // fail quietly; widget will use fallback
        }
      },
      () => {
        // location denied / unavailable
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Billing URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") === "success") {
      setBillingNotice({ ok: true, text: "Subscription updated successfully." });
    } else if (params.get("billing") === "cancelled") {
      setBillingNotice({ ok: false, text: "Checkout was cancelled." });
    } else if (params.get("credits") === "success") {
      setBillingNotice({ ok: true, text: "Credit purchase completed successfully." });
    } else if (params.get("credits") === "cancelled") {
      setBillingNotice({ ok: false, text: "Credit checkout was cancelled." });
    }
  }, []);

  // Load account data on my-account tab
  useEffect(() => {
    if (activeTab === "my-account") {
      void loadAccountOverview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ================================================================
     CALLBACKS
     ================================================================ */

  function openSlateDrop() {
    setSlateDropOpen(true);
  }

  const loadUnreadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setUnreadNotifications([]); return; }

      const { data } = await supabase
        .from("project_notifications")
        .select("id, project_id, title, message, link_path, created_at")
        .eq("user_id", authUser.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      setUnreadNotifications((data ?? []) as InboxNotification[]);
    } catch {
      setUnreadNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [supabase]);

  const scrollCarousel = useCallback((dir: number) => {
    carouselRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }, []);

  const launchBillingFlow = useCallback(async (endpoint: string, body?: Record<string, unknown>) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) {
      throw new Error(data?.error ?? "Unable to open billing flow");
    }
    window.location.href = data.url;
  }, []);

  const handleOpenBillingPortal = useCallback(async () => {
    setBillingError(null);
    setBillingBusy("portal");
    try {
      await launchBillingFlow("/api/billing/portal");
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to open billing portal");
      setBillingBusy(null);
    }
  }, [launchBillingFlow]);

  const handleBuyCredits = useCallback(async () => {
    setBillingError(null);
    setBillingBusy("credits");
    try {
      await launchBillingFlow("/api/billing/credits/checkout", { packId: "starter" });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to start credit checkout");
      setBillingBusy(null);
    }
  }, [launchBillingFlow]);

  const handleUpgradePlan = useCallback(async () => {
    setBillingError(null);
    setBillingBusy("upgrade");
    try {
      const nextTier = ent.tier === "trial" ? "creator" : ent.tier === "creator" ? "model" : "business";
      await launchBillingFlow("/api/billing/checkout", { tier: nextTier, billingCycle: "monthly" });
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : "Unable to start upgrade checkout");
      setBillingBusy(null);
    }
  }, [ent.tier, launchBillingFlow]);

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

  const copyText = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setBillingNotice({ ok: true, text: `${label} copied` });
      setTimeout(() => setBillingNotice(null), 2500);
    } catch {
      setBillingNotice({ ok: false, text: `Unable to copy ${label.toLowerCase()}` });
      setTimeout(() => setBillingNotice(null), 2500);
    }
  }, []);

  const applyLayoutPreset = useCallback(async (preset: "simple" | "creator" | "project") => {
    const mappedTab = preset === "creator" ? "content-studio" : preset === "project" ? "project-hub" : "overview";
    try {
      await supabase.auth.updateUser({ data: { dashboardPreset: preset, defaultTab: mappedTab } });
      setBillingNotice({ ok: true, text: `${preset.charAt(0).toUpperCase() + preset.slice(1)} view saved.` });
    } catch {
      setBillingNotice({ ok: false, text: "Could not save preset" });
    }
  }, [supabase]);

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
  }, [supabase, prefTheme, prefStartTab, prefNotification, prefImportantAlerts, prefShowDashboardTiles]);

  const handleSuggestFeature = useCallback(async () => {
    if (!suggestTitle.trim() || !suggestDesc.trim()) return;
    setSuggestLoading(true);
    try {
      await fetch("/api/suggest-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: suggestTitle, description: suggestDesc, priority: suggestPriority }),
      });
      setSuggestDone(true);
      setSuggestTitle("");
      setSuggestDesc("");
      setTimeout(() => setSuggestDone(false), 4000);
    } catch {
      // silently handle
    } finally {
      setSuggestLoading(false);
    }
  }, [suggestTitle, suggestDesc, suggestPriority]);

  /* ── Widget pref helpers ── */
  const toggleVisible = useCallback((id: string) => {
    setWidgetPrefs((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, visible: !p.visible } : p);
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setPrefsDirty(true);
  }, []);

  const setWidgetSize = useCallback((id: string, newSize: WidgetSize) => {
    setWidgetPrefs((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, size: newSize } : p);
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setPrefsDirty(true);
  }, []);

  const moveWidget = useCallback((id: string, dir: -1 | 1) => {
    setWidgetPrefs((prev) => {
      const arr = [...prev].sort((a, b) => a.order - b.order);
      const idx = arr.findIndex((p) => p.id === id);
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      const newArr = arr.map((p, i) => {
        if (i === idx) return { ...p, order: arr[target].order };
        if (i === target) return { ...p, order: arr[idx].order };
        return p;
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, newArr);
      return newArr;
    });
    setPrefsDirty(true);
  }, []);

  const savePrefs = useCallback(async () => {
    setPrefsSaving(true);
    try {
      await supabase.auth.updateUser({
        data: { dashboardWidgets: widgetPrefs, dashboardWidgetsVersion: WIDGET_PREFS_SCHEMA_VERSION },
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, widgetPrefs);
      setPrefsDirty(false);
    } finally {
      setPrefsSaving(false);
    }
  }, [supabase, widgetPrefs]);

  const resetPrefs = useCallback(() => {
    setWidgetPrefs(DEFAULT_WIDGET_PREFS);
    saveWidgetPrefs(DASHBOARD_STORAGE_KEY, DEFAULT_WIDGET_PREFS);
    setPrefsDirty(true);
  }, []);

  /* ── Drag-and-drop reorder ── */
  const handleDashDragStart = useCallback((idx: number) => setDashDragIdx(idx), []);

  const handleDashDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dashDragIdx === null || dashDragIdx === idx) return;
    setWidgetPrefs((prev) => {
      const vis = [...prev].filter((p) => p.visible).sort((a, b) => a.order - b.order);
      const visIds = vis.map((p) => p.id);
      const [moved] = visIds.splice(dashDragIdx, 1);
      visIds.splice(idx, 0, moved);
      const next = prev.map((p) => {
        const visIdx = visIds.indexOf(p.id);
        return visIdx >= 0 ? { ...p, order: visIdx } : p;
      });
      saveWidgetPrefs(DASHBOARD_STORAGE_KEY, next);
      return next;
    });
    setDashDragIdx(idx);
    setPrefsDirty(true);
  }, [dashDragIdx]);

  const handleDashDragEnd = useCallback(() => setDashDragIdx(null), []);

  /* ── Create-project wizard submit ── */
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
          .then((data) => {
            if (!data.error) {
              setWidgetsData({
                projects: Array.isArray(data.projects) ? data.projects : [],
                jobs: Array.isArray(data.jobs) ? data.jobs : [],
                financial: Array.isArray(data.financial) ? data.financial : [],
                continueWorking: Array.isArray(data.continueWorking) ? data.continueWorking : [],
                seats: Array.isArray(data.seats) ? data.seats : [],
                contacts: Array.isArray(data.contacts) ? data.contacts : [],
              });
            }
          })
          .catch(console.error);
      }
    } finally {
      setWizardCreating(false);
    }
  }, []);

  /* ================================================================
     DERIVED / MEMOS
     ================================================================ */

  const liveContacts: Contact[] = widgetsData?.contacts ?? [];
  const liveProjects = widgetsData?.projects ?? [];
  const liveJobs = widgetsData?.jobs ?? [];
  const liveFinancial = widgetsData?.financial ?? [];
  const liveContinueWorking = widgetsData?.continueWorking ?? [];
  const liveSeatMembers = widgetsData?.seats ?? [];

  const creditsUsed = accountOverview?.billing?.purchasedCredits ?? 0;
  const storageUsed = dashboardSummary
    ? Number((dashboardSummary.storageUsed / (1024 * 1024 * 1024)).toFixed(2))
    : (ent.tier === "trial" ? 1.2 : ent.tier === "creator" ? 12 : 45);

  const financialMax = Math.max(1, ...liveFinancial.map((f) => f.credits));

  const drawerMeta = useMemo(() => {
    return WIDGET_META.filter((m) => {
      if (m.id === "seats" && !ent.canManageSeats) return false;
      if (m.id === "upgrade" && ent.canManageSeats) return false;
      return true;
    });
  }, [ent.canManageSeats]);

  const availableWidgets = useMemo(() => new Set<string>([
    ...(ent.canViewSlateDropWidget ? ["slatedrop"] : []),
    "location",
    "data-usage", "processing", "financial", "calendar", "weather", "continue", "contacts", "suggest",
    ...(ent.canManageSeats ? ["seats"] : ["upgrade"]),
  ]), [ent.canViewSlateDropWidget, ent.canManageSeats]);

  const widgetCtx: WidgetRendererContext = useMemo(() => ({
    user, tier,
    entitlements: { maxCredits: ent.maxCredits, maxStorageGB: ent.maxStorageGB, maxSeats: ent.maxSeats, label: ent.label, canViewSlateDropWidget: ent.canViewSlateDropWidget, canManageSeats: ent.canManageSeats },
    userCoords, liveWeather, liveSeatMembers, liveContacts, liveProjects, liveJobs, liveFinancial, liveContinueWorking,
    creditsUsed, storageUsed, financialMax,
    billingBusy, billingError, handleBuyCredits, handleUpgradePlan,
    suggestTitle, suggestDesc, suggestPriority, suggestLoading, suggestDone,
    setSuggestTitle, setSuggestDesc, setSuggestPriority, handleSuggestFeature,
    weatherLogged, setWeatherLogged, setWidgetPrefs, setPrefsDirty,
  }), [
    user, tier, ent, userCoords, liveWeather, liveSeatMembers, liveContacts,
    liveProjects, liveJobs, liveFinancial, liveContinueWorking, creditsUsed,
    storageUsed, financialMax, billingBusy, billingError, handleBuyCredits,
    handleUpgradePlan, suggestTitle, suggestDesc, suggestPriority, suggestLoading,
    suggestDone, handleSuggestFeature, weatherLogged,
  ]);

  /* ================================================================
     RETURN
     ================================================================ */

  return {
    // Auth / entitlements
    ent,
    internalAccess,
    isClient,

    // Tab state
    activeTab, setActiveTab,
    mobileNavOpen, setMobileNavOpen,
    searchQuery, setSearchQuery,

    // Project state
    selectedProject, setSelectedProject,
    projectDropdownOpen, setProjectDropdownOpen,
    createWizardOpen, setCreateWizardOpen,
    wizardCreating,
    handleCreateProject,

    // Widget prefs
    widgetPrefs,
    customizeOpen, setCustomizeOpen,
    prefsDirty,
    prefsSaving,
    dashDragIdx,
    drawerMeta,
    toggleVisible,
    setWidgetSize,
    moveWidget,
    savePrefs,
    resetPrefs,
    handleDashDragStart,
    handleDashDragOver,
    handleDashDragEnd,

    // Billing
    billingBusy,
    billingError,
    billingNotice, setBillingNotice,
    handleOpenBillingPortal,
    handleBuyCredits,
    handleUpgradePlan,

    // Account
    accountOverview,
    accountLoading,
    accountError,
    loadAccountOverview,

    // API keys
    apiKeyLabel, setApiKeyLabel,
    apiKeyBusy,
    apiKeyError,
    generatedApiKey,
    handleGenerateApiKey,
    handleRevokeApiKey,

    // Prefs
    prefTheme, setPrefTheme,
    prefStartTab, setPrefStartTab,
    prefNotification, setPrefNotification,
    prefImportantAlerts, setPrefImportantAlerts,
    prefShowDashboardTiles, setPrefShowDashboardTiles,
    saveAccountPreferences,
    applyLayoutPreset,
    copyText,

    // Suggest
    suggestTitle, setSuggestTitle,
    suggestDesc, setSuggestDesc,
    suggestPriority, setSuggestPriority,
    suggestLoading,
    suggestDone,
    handleSuggestFeature,

    // Weather
    weatherLogged, setWeatherLogged,
    userCoords,
    liveWeather,

    // Notifications
    notificationsLoading,
    unreadNotifications,
    loadUnreadNotifications,

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
    availableWidgets,
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
