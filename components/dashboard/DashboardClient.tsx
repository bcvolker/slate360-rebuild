"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEntitlements, type Tier } from "@/lib/entitlements";
import DashboardHeader from "@/components/shared/DashboardHeader";
import CreateProjectWizard, { type CreateProjectPayload } from "@/components/project-hub/CreateProjectWizard";
import MarketClient from "@/components/dashboard/MarketClient";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import { type WidgetRendererContext } from "@/components/dashboard/DashboardWidgetRenderer";
import DashboardMyAccount from "@/components/dashboard/DashboardMyAccount";
import DashboardSlateDropWindow from "@/components/dashboard/DashboardSlateDropWindow";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import {
  WIDGET_META,
  type WidgetPref,
  type WidgetMeta,
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
import {
  ChevronLeft,
  ArrowRight,
  TrendingUp,
  FolderOpen,
  BarChart3,
  Zap,
  Palette,
  Globe,
  Film,
  Layers,
  Compass,
  User,
  Shield,
  LayoutDashboard,
} from "lucide-react";
import type {
  DashboardProject as Project,
  DashboardContact as Contact,
  LiveWeatherState,
  DashboardJob as Job,
  DashboardWidgetsPayload,
  DashboardDeployInfo as DeployInfoPayload,
  DashboardInboxNotification as InboxNotification,
  DashTab,
} from "@/lib/types/dashboard";


/* ================================================================
   TYPES
   ================================================================ */

interface DashboardProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
  isSlateCeo?: boolean;
  /** True when user is in the slate360_staff table (invited by CEO). */
  isSlateStaff?: boolean;
  canAccessCeo?: boolean;
  canAccessMarket?: boolean;
  canAccessAthlete360?: boolean;
}

// Project, Contact, LiveWeatherState, Job, DashboardWidgetsPayload,
// InboxNotification, DeployInfoPayload — imported from @/lib/types/dashboard

// WidgetPref — imported from @/lib/widgets/widget-meta

interface AccountOverview {
  profile: {
    name: string;
    email: string;
    orgName: string;
    role: string;
  };
  billing: {
    plan: string;
    tier: Tier;
    status: "active" | "trialing" | "past_due" | "canceled";
    renewsOn: string | null;
    purchasedCredits: number;
    totalCreditsBalance: number;
  };
  usage: {
    storageUsedGb: number;
    storageLimitGb: number;
    monthlyCredits: number;
    projectsCount: number;
    modelsCount: number;
    toursCount: number;
    docsCount: number;
  };
  sessions: Array<{ id: string; device: string; ip: string; lastActive: string }>;
  auditLog: Array<{ id: string; action: string; actor: string; createdAt: string }>;
  apiKeys: Array<{ id: string; label: string; lastFour: string; createdAt: string }>;
  isAdmin: boolean;
}

// DashboardWidgetsPayload, InboxNotification, DeployInfoPayload — imported from @/lib/types/dashboard

/* ================================================================
   WIDGET META — imported from @/lib/widgets/widget-meta
   ================================================================ */

const DEFAULT_WIDGET_PREFS: WidgetPref[] = buildDefaultPrefs({ expandedIds: ["calendar", "seats"] });

/* ================================================================
   HELPERS
   ================================================================ */

/* weatherIcon, statusColor, statusIcon moved to DashboardWidgetRenderer */

const projectTypeEmoji = (t: Project["type"]) => {
  switch (t) {
    case "3d": return "🏗️";
    case "360": return "📷";
    case "geo": return "🛰️";
    case "plan": return "📐";
  }
};

/* ════════════════════════════════════════════════════════════════
   WIDGET CARD — imported from @/components/widgets/WidgetCard
   ════════════════════════════════════════════════════════════════ */

/* ================================================================
   TAB WIREFRAME PLACEHOLDER
   ================================================================ */

function TabWireframe({ tab, onBack, onOpenSlateDrop }: { tab: DashTab; onBack: () => void; onOpenSlateDrop?: () => void }) {
  const Icon = tab.icon;
  const descMap: Record<string, string> = {
    "project-hub":    "Centralized project management, RFIs, daily reports, and team coordination.",
    "design-studio":  "3D modelling, BIM coordination, and real-time design collaboration.",
    "content-studio": "Create and manage visual content, renderings, and marketing assets.",
    "tours":          "Immersive 360° virtual tours for client presentations and remote inspections.",
    "geospatial":     "Drone surveys, point clouds, GIS mapping, and geospatial data workflows.",
    "virtual-studio": "Virtual production, site visualization, and simulation environments.",
    "analytics":      "Project analytics, progress tracking, financial reporting, and insights.",
    "slatedrop":      "Intelligent file management, delivery, and secure document sharing.",
    "integrations":   "Connect external systems, map data syncs, and monitor integration health.",
    "my-account":     "Manage your profile, subscription, billing, and account settings.",
    "ceo":            "Platform-wide oversight, admin controls, and strategic metrics.",
    "market":         "Marketplace listings, procurement workflows, and vendor management.",
    "athlete360":     "Athletic performance tracking, recruitment tools, and 360° athlete profiles.",
  };
  const desc = descMap[tab.id] ?? `The ${tab.label} workspace is coming soon.`;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-sm"
        style={{ backgroundColor: `${tab.color}18`, color: tab.color }}
      >
        <Icon size={36} />
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">{tab.label}</h2>
      {tab.isCEOOnly && (
        <span className="inline-block mb-3 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
          CEO Access Only
        </span>
      )}
      <p className="text-sm text-gray-400 mb-8 max-w-sm leading-relaxed">{desc}</p>
      {tab.id === "slatedrop" && (
        <button
          onClick={onOpenSlateDrop}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 mb-4"
          style={{ backgroundColor: "#FF4D00" }}
        >
          Open SlateDrop <ArrowRight size={15} />
        </button>
      )}
      <button
        onClick={onBack}
        className="text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5 mt-2"
      >
        <ChevronLeft size={13} /> Back to Dashboard
      </button>
    </div>
  );
}

/* ================================================================
   MAIN DASHBOARD COMPONENT
   ================================================================ */

export default function DashboardClient({
  user,
  tier,
  isSlateCeo = false,
  canAccessCeo = false,
  canAccessMarket = false,
  canAccessAthlete360 = false,
}: DashboardProps) {
  const ent = getEntitlements(tier, { isSlateCeo });
  const supabase = createClient();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  const internalAccess = {
    ceo: canAccessCeo,
    market: canAccessMarket,
    athlete360: canAccessAthlete360,
  };

  // Build the ordered, filtered tab list based on tier entitlements + identity
  const visibleTabs: DashTab[] = ([
    { id: "project-hub",    label: "Project Hub",    icon: LayoutDashboard, color: "#FF4D00" },
    { id: "design-studio",  label: "Design Studio",  icon: Palette,         color: "#7C3AED" },
    { id: "content-studio", label: "Content Studio", icon: Layers,          color: "#EC4899" },
    { id: "tours",          label: "360 Tours",      icon: Compass,         color: "#0891B2" },
    { id: "geospatial",     label: "Geospatial",     icon: Globe,           color: "#059669" },
    { id: "virtual-studio", label: "Virtual Studio", icon: Film,            color: "#D97706" },
    { id: "analytics",      label: "Analytics",      icon: BarChart3,       color: "#6366F1" },
    { id: "slatedrop",      label: "SlateDrop",      icon: FolderOpen,      color: "#FF4D00" },
    { id: "my-account",     label: "My Account",     icon: User,            color: "#FF4D00" },
    ...((canAccessCeo || canAccessMarket || canAccessAthlete360) ? ([
      { id: "ceo",        label: "CEO",          icon: Shield,      color: "#FF4D00", isCEOOnly: true },
      { id: "market",     label: "Market Robot", icon: TrendingUp,  color: "#6366F1", isCEOOnly: true },
      { id: "athlete360", label: "Athlete360",   icon: Zap,         color: "#FF4D00", isCEOOnly: true },
    ] as DashTab[]) : []),
  ] as DashTab[]).filter((tab) => {
    switch (tab.id) {
      case "project-hub":    return ent.canAccessHub;
      case "design-studio":  return ent.canAccessDesignStudio;
      case "content-studio": return ent.canAccessContent;
      case "tours":          return ent.canAccessTourBuilder;
      case "geospatial":     return ent.canAccessGeospatial;
      case "virtual-studio": return ent.canAccessVirtual;
      case "analytics":      return ent.canAccessAnalytics;
      case "slatedrop":      return ent.canViewSlateDropWidget;
      case "my-account":     return true;
      case "ceo":            return canAccessCeo;
      case "market":         return canAccessMarket;
      case "athlete360":     return canAccessAthlete360;
      default:               return false;
    }
  });

  const [selectedProject, setSelectedProject] = useState("all");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestDesc, setSuggestDesc] = useState("");
  const [suggestPriority, setSuggestPriority] = useState<"low" | "medium" | "high">("medium");
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestDone, setSuggestDone] = useState(false);
  const [weatherLogged, setWeatherLogged] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  // Initialize with defaults — sync from localStorage in useEffect to avoid hydration mismatch (#418).
  // Server and client must agree on initial render; localStorage is only available client-side.
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(DEFAULT_WIDGET_PREFS);
  const [prefsDirty, setPrefsDirty] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [dashDragIdx, setDashDragIdx] = useState<number | null>(null);
  const [billingBusy, setBillingBusy] = useState<"portal" | "credits" | "upgrade" | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingNotice, setBillingNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [wizardCreating, setWizardCreating] = useState(false);
  const [accountOverview, setAccountOverview] = useState<AccountOverview | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [apiKeyLabel, setApiKeyLabel] = useState("");
  const [apiKeyBusy, setApiKeyBusy] = useState<"create" | string | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [prefTheme, setPrefTheme] = useState<"light" | "dark" | "system">("system");
  const [prefStartTab, setPrefStartTab] = useState("overview");
  const [prefNotification, setPrefNotification] = useState<"off" | "daily" | "weekly">("daily");
  const [prefImportantAlerts, setPrefImportantAlerts] = useState(true);
  const [prefShowDashboardTiles, setPrefShowDashboardTiles] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<InboxNotification[]>([]);

  useEffect(() => {
    setIsClient(true);
    // Sync widget prefs from localStorage now that we are client-side.
    // This must happen after hydration to avoid React error #418.
    const storedPrefs = loadWidgetPrefs(DASHBOARD_STORAGE_KEY, DEFAULT_WIDGET_PREFS);
    setWidgetPrefs(storedPrefs);
  }, []);

  // ── SlateDrop floating window ───────────────────────────────
  const [slateDropOpen, setSlateDropOpen] = useState(false);

  // ── Widget popout window ────────────────────────────────────
  const [widgetPopoutId, setWidgetPopoutId] = useState<string | null>(null);

  function openSlateDrop() {
    setSlateDropOpen(true);
  }

  const loadUnreadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUnreadNotifications([]);
        return;
      }

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

  const [dashboardSummary, setDashboardSummary] = useState<{ recentFiles: unknown[]; storageUsed: number } | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherState | null>(null);
  const [widgetsData, setWidgetsData] = useState<DashboardWidgetsPayload | null>(null);
  const [deployInfo, setDeployInfo] = useState<DeployInfoPayload | null>(null);

  /* ── Load saved prefs from Supabase user metadata on mount ─── */
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

    // Fetch dashboard summary
    fetch("/api/dashboard/summary")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setDashboardSummary(data);
      })
      .catch(console.error);

    // Fetch account overview for quotas
    fetch("/api/account/overview")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setAccountOverview(data);
      })
      .catch(console.error);

    // Fetch deployment identity for admin diagnostics
    fetch("/api/deploy-info", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!data?.error) {
          setDeployInfo(data as DeployInfoPayload);
        }
      })
      .catch(() => {
        setDeployInfo(null);
      });

    // Fetch live widget datasets
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

  const carouselRef = useRef<HTMLDivElement>(null);

  /* ── Derived ── */

  // Real contacts come from organization_members + project_members via /api/dashboard/widgets
  const liveContacts: Contact[] = widgetsData?.contacts ?? [];

  const liveProjects = widgetsData?.projects ?? [];
  const liveJobs = widgetsData?.jobs ?? [];
  const liveFinancial = widgetsData?.financial ?? [];
  const liveContinueWorking = widgetsData?.continueWorking ?? [];
  const liveSeatMembers = widgetsData?.seats ?? [];

  const creditsUsed = accountOverview?.billing?.purchasedCredits ?? 0;
  const storageUsed = dashboardSummary ? Number((dashboardSummary.storageUsed / (1024 * 1024 * 1024)).toFixed(2)) : (ent.tier === "trial" ? 1.2 : ent.tier === "creator" ? 12 : 45);
  

  /* ── Handlers ── */
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
      const tier = ent.tier === "trial" ? "creator" : ent.tier === "creator" ? "model" : "business";
      await launchBillingFlow("/api/billing/checkout", {
        tier,
        billingCycle: "monthly",
      });
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
      if (!res.ok) {
        throw new Error(data?.error ?? "Unable to load account data");
      }
      setAccountOverview(data as AccountOverview);
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
      await supabase.auth.updateUser({
        data: {
          dashboardPreset: preset,
          defaultTab: mappedTab,
        },
      });
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
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to create API key");
      }
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
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to revoke API key");
      }
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

  useEffect(() => {
    if (activeTab === "my-account") {
      void loadAccountOverview();
    }
  }, [activeTab, loadAccountOverview]);

  const handleSuggestFeature = useCallback(async () => {
    if (!suggestTitle.trim() || !suggestDesc.trim()) return;
    setSuggestLoading(true);
    try {
      await fetch("/api/suggest-feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestTitle,
          description: suggestDesc,
          priority: suggestPriority,
        }),
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

  /* ── Pref helpers ── */
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
        data: {
          dashboardWidgets: widgetPrefs,
          dashboardWidgetsVersion: WIDGET_PREFS_SCHEMA_VERSION,
        },
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

  /* ── Drag-and-drop reorder helpers for dashboard widget grid ── */
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

  /* ── Tier-filtered meta for customization drawer ── */
  const drawerMeta = useMemo(() => {
    return WIDGET_META.filter((m) => {
      if (m.id === "seats" && !ent.canManageSeats) return false;
      if (m.id === "upgrade" && ent.canManageSeats) return false;
      return true;
    });
  }, [ent.canManageSeats]);

  const financialMax = Math.max(1, ...liveFinancial.map((f) => f.credits));

  /* ── Computed widget context for overview ── */
  const availableWidgets = useMemo(() => new Set<string>([
    ...(ent.canViewSlateDropWidget ? ["slatedrop"] : []),
    "location",
    "data-usage","processing","financial","calendar","weather","continue","contacts","suggest",
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
     RENDER
     ================================================================ */

  return (
    <div className="min-h-screen bg-[#ECEEF2] overflow-x-hidden">
      <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isSlateCeo}
        internalAccess={internalAccess}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search projects, files, contacts…"
        prefsDirty={prefsDirty}
        onCustomizeOpen={() => setCustomizeOpen(true)}
        notifications={unreadNotifications}
        notificationsLoading={notificationsLoading}
        onRefreshNotifications={loadUnreadNotifications}
      />

      {/* ════════ MAIN CONTENT ════════ */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
        {(canAccessCeo || accountOverview?.isAdmin) && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] text-blue-900">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span><span className="font-semibold">Runtime:</span> {deployInfo?.url ?? "unknown"}</span>
              <span><span className="font-semibold">Branch:</span> {deployInfo?.branch ?? "unknown"}</span>
              <span><span className="font-semibold">Commit:</span> {(deployInfo?.commit ?? "unknown").slice(0, 7)}</span>
              <span><span className="font-semibold">Tier:</span> {ent.tier}</span>
              <span><span className="font-semibold">Org:</span> {accountOverview?.profile.orgName ?? "unresolved"}</span>
              <span><span className="font-semibold">Role:</span> {accountOverview?.profile.role ?? "unresolved"}</span>
            </div>
          </div>
        )}

        {billingNotice && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${billingNotice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
            {billingNotice.text}
          </div>
        )}

        {activeTab !== "overview" && (
          <div className="mb-6">
            <button
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              <ChevronLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        )}

        {/* ════════ OVERVIEW TAB CONTENT ════════ */}
        {activeTab === "overview" && (
          <DashboardOverview
            userName={user.name.split(" ")[0]}
            visibleTabs={visibleTabs}
            showDashboardTiles={prefShowDashboardTiles}
            onOpenSlateDrop={openSlateDrop}
            onSetActiveTab={setActiveTab}
            mobileNavOpen={mobileNavOpen}
            onMobileNavToggle={() => setMobileNavOpen((v) => !v)}
            projects={liveProjects}
            selectedProject={selectedProject}
            onSelectProject={(id) => { setSelectedProject(id); setProjectDropdownOpen(false); }}
            projectDropdownOpen={projectDropdownOpen}
            onProjectDropdownToggle={() => setProjectDropdownOpen((v) => !v)}
            projectTypeEmoji={projectTypeEmoji}
            onCreateProject={() => setCreateWizardOpen(true)}
            carouselRef={carouselRef}
            onScrollCarousel={scrollCarousel}
            onProjectDeleted={(id) => {
              setWidgetsData((prev) =>
                prev ? { ...prev, projects: prev.projects.filter((pr) => pr.id !== id) } : prev
              );
            }}
            widgetPrefs={widgetPrefs}
            widgetPopoutId={widgetPopoutId}
            onCloseWidgetPopout={() => setWidgetPopoutId(null)}
            dashDragIdx={dashDragIdx}
            onDragStart={handleDashDragStart}
            onDragOver={handleDashDragOver}
            onDragEnd={handleDashDragEnd}
            availableWidgets={availableWidgets}
            widgetCtx={widgetCtx}
          />
        )}

        {/* ════════ SPECIFIC TAB WIREFRAME ════════ */}
        {activeTab === "market" && (
          <MarketClient />
        )}
        {activeTab === "my-account" && (
          <DashboardMyAccount
            user={user}
            accountOverview={accountOverview}
            accountLoading={accountLoading}
            accountError={accountError}
            apiKeyError={apiKeyError}
            storageUsed={storageUsed}
            entitlements={{ maxStorageGB: ent.maxStorageGB, label: ent.label, tier: ent.tier }}
            isClient={isClient}
            onRefresh={() => void loadAccountOverview()}
            onOpenBillingPortal={() => void handleOpenBillingPortal()}
            onBuyCredits={() => void handleBuyCredits()}
            onUpgradePlan={() => void handleUpgradePlan()}
            onApplyPreset={(preset) => void applyLayoutPreset(preset)}
            onCopyText={(value, label) => void copyText(value, label)}
            onGenerateApiKey={() => void handleGenerateApiKey()}
            onRevokeApiKey={(id) => void handleRevokeApiKey(id)}
            onSavePreferences={() => void saveAccountPreferences()}
            onBackToOverview={() => setActiveTab("overview")}
            onSetNotice={setBillingNotice}
            apiKeyLabel={apiKeyLabel}
            onApiKeyLabelChange={setApiKeyLabel}
            apiKeyBusy={apiKeyBusy}
            generatedApiKey={generatedApiKey}
            prefTheme={prefTheme}
            onPrefThemeChange={setPrefTheme}
            prefStartTab={prefStartTab}
            onPrefStartTabChange={setPrefStartTab}
            prefNotification={prefNotification}
            onPrefNotificationChange={setPrefNotification}
            prefImportantAlerts={prefImportantAlerts}
            onPrefImportantAlertsChange={setPrefImportantAlerts}
            prefShowDashboardTiles={prefShowDashboardTiles}
            onPrefShowDashboardTilesChange={setPrefShowDashboardTiles}
          />
        )}
        {activeTab === "project-hub" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Open Project Hub</h3>
            <p className="mt-1 text-sm text-gray-500">Project Hub now runs in its dedicated workspace route.</p>
            <Link
              href="/project-hub"
              className="mt-4 inline-flex items-center rounded-lg bg-[#FF4D00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E64500]"
            >
              Go to Project Hub
            </Link>
          </div>
        )}
        {activeTab === "integrations" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Open Integrations</h3>
            <p className="mt-1 text-sm text-gray-500">Integrations now runs in its dedicated workspace route.</p>
            <Link
              href="/integrations"
              className="mt-4 inline-flex items-center rounded-lg bg-[#FF4D00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E04400]"
            >
              Go to Integrations
            </Link>
          </div>
        )}
        {activeTab === "analytics" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Open Analytics &amp; Reports</h3>
            <p className="mt-1 text-sm text-gray-500">Analytics &amp; Reports now runs in its dedicated workspace route.</p>
            <Link
              href="/analytics"
              className="mt-4 inline-flex items-center rounded-lg bg-[#FF4D00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E04400]"
            >
              Go to Analytics
            </Link>
          </div>
        )}
        {activeTab === "ceo" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-900">Open CEO Command Center</h3>
            <p className="mt-1 text-sm text-gray-500">The CEO Command Center now runs in its dedicated workspace route.</p>
            <Link
              href="/ceo"
              className="mt-4 inline-flex items-center rounded-lg bg-[#FF4D00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E64500]"
            >
              Go to CEO Command Center
            </Link>
          </div>
        )}
        {/* All remaining tabs now have standalone routes — show redirect card */}
        {activeTab !== "overview" && activeTab !== "market" && activeTab !== "my-account" && activeTab !== "project-hub" && activeTab !== "integrations" && activeTab !== "analytics" && activeTab !== "ceo" && (() => {
          const tab = visibleTabs.find((t) => t.id === activeTab);
          if (!tab) return null;
          const routeMap: Record<string, string> = {
            "design-studio": "/design-studio",
            "content-studio": "/content-studio",
            "tours": "/tours",
            "geospatial": "/geospatial",
            "virtual-studio": "/virtual-studio",
          };
          const route = routeMap[tab.id];
          if (route) {
            return (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-base font-black text-gray-900">Open {tab.label}</h3>
                <p className="mt-1 text-sm text-gray-500">{tab.label} now runs in its dedicated workspace route.</p>
                <Link
                  href={route}
                  className="mt-4 inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                  style={{ backgroundColor: tab.color }}
                >
                  Go to {tab.label}
                </Link>
              </div>
            );
          }
          return <TabWireframe tab={tab} onBack={() => setActiveTab("overview")} onOpenSlateDrop={openSlateDrop} />;
        })()}
      </main>

      {/* ════════ CUSTOMIZE PANEL (shared drawer) ════════ */}
      <WidgetCustomizeDrawer
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize Dashboard"
        subtitle="Reorder, show or hide, and resize widgets"
        widgetPrefs={widgetPrefs}
        widgetMeta={drawerMeta}
        onToggleVisible={toggleVisible}
        onSetSize={setWidgetSize}
        onMoveOrder={moveWidget}
        onReset={resetPrefs}
        onSave={async () => { await savePrefs(); setCustomizeOpen(false); }}
        saving={prefsSaving}
        dirty={prefsDirty}
      />

      {/* ════════ SLATEDROP FLOATING WINDOW ════════ */}
      <DashboardSlateDropWindow
        open={slateDropOpen}
        onClose={() => setSlateDropOpen(false)}
        user={user}
        tier={tier}
      />

      {/* ── Create Project Wizard ── */}
      <CreateProjectWizard
        open={createWizardOpen}
        creating={wizardCreating}
        error={null}
        onClose={() => setCreateWizardOpen(false)}
        onSubmit={async (payload: CreateProjectPayload) => {
          setWizardCreating(true);
          try {
            const res = await fetch("/api/projects/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (res.ok) {
              setCreateWizardOpen(false);
              // Refresh the projects widget
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
        }}
      />
    </div>
  );
}
