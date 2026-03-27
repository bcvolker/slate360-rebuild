"use client";

import { useDashboardState, type DashboardProps } from "@/lib/hooks/useDashboardState";
import DashboardHeader from "@/components/shared/DashboardHeader";
import CreateProjectWizard, { type CreateProjectPayload } from "@/components/project-hub/CreateProjectWizard";
import MarketClient from "@/components/dashboard/MarketClient";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import DashboardMyAccount from "@/components/dashboard/DashboardMyAccount";
import DashboardSlateDropWindow from "@/components/dashboard/DashboardSlateDropWindow";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import TabWireframe from "@/components/dashboard/TabWireframe";
import TabRedirectCard, { hasRedirectRoute } from "@/components/dashboard/TabRedirectCard";
import {
  ChevronLeft,
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
import type { DashTab, DashboardProject as Project } from "@/lib/types/dashboard";

/* ================================================================
   HELPERS
   ================================================================ */

const projectTypeEmoji = (t: Project["type"]) => {
  switch (t) {
    case "3d": return "🏗️";
    case "360": return "📷";
    case "geo": return "🛰️";
    case "plan": return "📐";
  }
};

/* ================================================================
   VISIBLE TABS BUILDER
   ================================================================ */

function useVisibleTabs(
  ent: ReturnType<typeof import("@/lib/entitlements").getEntitlements>,
  canAccessCeo: boolean,
  canAccessMarket: boolean,
  canAccessAthlete360: boolean,
): DashTab[] {
  return ([
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
}

/* ================================================================
   MAIN DASHBOARD COMPONENT
   ================================================================ */

export default function DashboardClient(props: DashboardProps) {
  const {
    canAccessCeo = false,
    canAccessMarket = false,
    canAccessAthlete360 = false,
  } = props;

  const s = useDashboardState(props);
  const visibleTabs = useVisibleTabs(s.ent, canAccessCeo, canAccessMarket, canAccessAthlete360);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="min-h-screen bg-[#ECEEF2] overflow-x-hidden">
      <DashboardHeader
        user={props.user}
        tier={props.tier}
        isCeo={props.isSlateCeo ?? false}
        internalAccess={s.internalAccess}
        searchQuery={s.searchQuery}
        onSearchChange={s.setSearchQuery}
        searchPlaceholder="Search projects, files, contacts…"
        prefsDirty={s.prefsDirty}
        onCustomizeOpen={() => s.setCustomizeOpen(true)}
        notifications={s.unreadNotifications}
        notificationsLoading={s.notificationsLoading}
        onRefreshNotifications={s.loadUnreadNotifications}
      />

      {/* ════════ MAIN CONTENT ════════ */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden">
        {(canAccessCeo || s.accountOverview?.isAdmin) && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[11px] text-blue-900">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span><span className="font-semibold">Runtime:</span> {s.deployInfo?.url ?? "unknown"}</span>
              <span><span className="font-semibold">Branch:</span> {s.deployInfo?.branch ?? "unknown"}</span>
              <span><span className="font-semibold">Commit:</span> {(s.deployInfo?.commit ?? "unknown").slice(0, 7)}</span>
              <span><span className="font-semibold">Tier:</span> {s.ent.tier}</span>
              <span><span className="font-semibold">Org:</span> {s.accountOverview?.profile.orgName ?? "unresolved"}</span>
              <span><span className="font-semibold">Role:</span> {s.accountOverview?.profile.role ?? "unresolved"}</span>
            </div>
          </div>
        )}

        {s.billingNotice && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${s.billingNotice.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
            {s.billingNotice.text}
          </div>
        )}

        {s.activeTab !== "overview" && (
          <div className="mb-6">
            <button
              onClick={() => s.setActiveTab("overview")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
              <ChevronLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        )}

        {/* ════════ OVERVIEW TAB CONTENT ════════ */}
        {s.activeTab === "overview" && (
          <DashboardOverview
            userName={props.user.name.split(" ")[0]}
            visibleTabs={visibleTabs}
            showDashboardTiles={s.prefShowDashboardTiles}
            onOpenSlateDrop={s.openSlateDrop}
            onSetActiveTab={s.setActiveTab}
            mobileNavOpen={s.mobileNavOpen}
            onMobileNavToggle={() => s.setMobileNavOpen((v) => !v)}
            projects={s.liveProjects}
            selectedProject={s.selectedProject}
            onSelectProject={(id) => { s.setSelectedProject(id); s.setProjectDropdownOpen(false); }}
            projectDropdownOpen={s.projectDropdownOpen}
            onProjectDropdownToggle={() => s.setProjectDropdownOpen((v) => !v)}
            projectTypeEmoji={projectTypeEmoji}
            onCreateProject={() => s.setCreateWizardOpen(true)}
            carouselRef={s.carouselRef}
            onScrollCarousel={s.scrollCarousel}
            onProjectDeleted={(id) => {
              s.setWidgetsData((prev) =>
                prev ? { ...prev, projects: prev.projects.filter((pr) => pr.id !== id) } : prev
              );
            }}
            widgetPrefs={s.widgetPrefs}
            widgetPopoutId={s.widgetPopoutId}
            onCloseWidgetPopout={() => s.setWidgetPopoutId(null)}
            dashDragIdx={s.dashDragIdx}
            onDragStart={s.handleDashDragStart}
            onDragOver={s.handleDashDragOver}
            onDragEnd={s.handleDashDragEnd}
            availableWidgets={s.availableWidgets}
            widgetCtx={s.widgetCtx}
          />
        )}

        {/* ════════ SPECIFIC TAB WIREFRAME ════════ */}
        {s.activeTab === "market" && (
          <MarketClient />
        )}
        {s.activeTab === "my-account" && (
          <DashboardMyAccount
            user={props.user}
            accountOverview={s.accountOverview}
            accountLoading={s.accountLoading}
            accountError={s.accountError}
            apiKeyError={s.apiKeyError}
            storageUsed={s.storageUsed}
            entitlements={{ maxStorageGB: s.ent.maxStorageGB, label: s.ent.label, tier: s.ent.tier }}
            isClient={s.isClient}
            onRefresh={() => void s.loadAccountOverview()}
            onOpenBillingPortal={() => void s.handleOpenBillingPortal()}
            onBuyCredits={() => void s.handleBuyCredits()}
            onUpgradePlan={() => void s.handleUpgradePlan()}
            onApplyPreset={(preset) => void s.applyLayoutPreset(preset)}
            onCopyText={(value, label) => void s.copyText(value, label)}
            onGenerateApiKey={() => void s.handleGenerateApiKey()}
            onRevokeApiKey={(id) => void s.handleRevokeApiKey(id)}
            onSavePreferences={() => void s.saveAccountPreferences()}
            onBackToOverview={() => s.setActiveTab("overview")}
            onSetNotice={s.setBillingNotice}
            apiKeyLabel={s.apiKeyLabel}
            onApiKeyLabelChange={s.setApiKeyLabel}
            apiKeyBusy={s.apiKeyBusy}
            generatedApiKey={s.generatedApiKey}
            prefTheme={s.prefTheme}
            onPrefThemeChange={s.setPrefTheme}
            prefStartTab={s.prefStartTab}
            onPrefStartTabChange={s.setPrefStartTab}
            prefNotification={s.prefNotification}
            onPrefNotificationChange={s.setPrefNotification}
            prefImportantAlerts={s.prefImportantAlerts}
            onPrefImportantAlertsChange={s.setPrefImportantAlerts}
            prefShowDashboardTiles={s.prefShowDashboardTiles}
            onPrefShowDashboardTilesChange={s.setPrefShowDashboardTiles}
          />
        )}

        {/* ════════ TAB REDIRECT CARDS + WIREFRAMES ════════ */}
        {s.activeTab !== "overview" && s.activeTab !== "market" && s.activeTab !== "my-account" && (() => {
          const tab = visibleTabs.find((t) => t.id === s.activeTab);
          if (!tab) return null;
          if (hasRedirectRoute(tab.id)) return <TabRedirectCard tab={tab} />;
          return <TabWireframe tab={tab} onBack={() => s.setActiveTab("overview")} onOpenSlateDrop={s.openSlateDrop} />;
        })()}
      </main>

      {/* ════════ CUSTOMIZE PANEL (shared drawer) ════════ */}
      <WidgetCustomizeDrawer
        open={s.customizeOpen}
        onClose={() => s.setCustomizeOpen(false)}
        title="Customize Dashboard"
        subtitle="Reorder, show or hide, and resize widgets"
        widgetPrefs={s.widgetPrefs}
        widgetMeta={s.drawerMeta}
        onToggleVisible={s.toggleVisible}
        onSetSize={s.setWidgetSize}
        onMoveOrder={s.moveWidget}
        onReset={s.resetPrefs}
        onSave={async () => { await s.savePrefs(); s.setCustomizeOpen(false); }}
        saving={s.prefsSaving}
        dirty={s.prefsDirty}
      />

      {/* ════════ SLATEDROP FLOATING WINDOW ════════ */}
      <DashboardSlateDropWindow
        open={s.slateDropOpen}
        onClose={() => s.setSlateDropOpen(false)}
        user={props.user}
        tier={props.tier}
      />

      {/* ── Create Project Wizard ── */}
      <CreateProjectWizard
        open={s.createWizardOpen}
        creating={s.wizardCreating}
        error={null}
        onClose={() => s.setCreateWizardOpen(false)}
        onSubmit={(payload: CreateProjectPayload) => s.handleCreateProject(payload)}
      />
    </div>
  );
}
