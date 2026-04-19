"use client";

import { useDashboardState, type DashboardProps } from "@/lib/hooks/useDashboardState";
import { useEffect } from "react";
import DashboardHeader from "@/components/shared/DashboardHeader";
import CreateProjectWizard, { type CreateProjectPayload } from "@/components/project-hub/CreateProjectWizard";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import DashboardMyAccount from "@/components/dashboard/DashboardMyAccount";
import DashboardSlateDropWindow from "@/components/dashboard/DashboardSlateDropWindow";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import TabWireframe from "@/components/dashboard/TabWireframe";
import TabRedirectCard, { hasRedirectRoute } from "@/components/dashboard/TabRedirectCard";
import UpgradeGate from "@/components/shared/UpgradeGate";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  ChevronLeft,
  BarChart3,
  Palette,
  Globe,
  Film,
  Layers,
  Compass,
  User,
  Shield,
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
  canAccessOperationsConsole: boolean,
): DashTab[] {
  const ALL_TABS: (DashTab & { entKey?: keyof typeof ent; requiredTier?: import("@/lib/entitlements").Tier })[] = [
    { id: "design-studio",  label: "Design Studio",  icon: Palette,         color: "#7C3AED", entKey: "canAccessDesignStudio", requiredTier: "standard" },
    { id: "content-studio", label: "Content Studio", icon: Layers,          color: "#EC4899", entKey: "canAccessContent",      requiredTier: "standard" },
    { id: "tours",          label: "360 Tours",      icon: Compass,         color: "#0891B2", entKey: "canAccessStandaloneTourBuilder",  requiredTier: "standard" },
    { id: "geospatial",     label: "Geospatial",     icon: Globe,           color: "#059669", entKey: "canAccessGeospatial",   requiredTier: "standard" },
    { id: "virtual-studio", label: "Virtual Studio", icon: Film,            color: "#2563EB", entKey: "canAccessVirtual",      requiredTier: "standard" },
    { id: "analytics",      label: "Analytics",      icon: BarChart3,       color: "#6366F1", entKey: "canAccessAnalytics",    requiredTier: "business" },
    { id: "my-account",     label: "My Account",     icon: User,            color: "#3B82F6" },
  ];

  const internalTabs: DashTab[] = canAccessOperationsConsole
    ? [{ id: "operations-console", label: "Operations Console", icon: Shield, color: "#3B82F6", isCEOOnly: true }]
    : [];

  return [
    ...ALL_TABS.map((tab) => {
      const hasAccess = tab.entKey ? Boolean(ent[tab.entKey]) : true;
      return {
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        color: tab.color,
        locked: !hasAccess,
        requiredTier: !hasAccess ? tab.requiredTier : undefined,
      } as DashTab;
    }),
    ...internalTabs,
  ];
}

/* ================================================================
   MAIN DASHBOARD COMPONENT
   ================================================================ */

export default function DashboardClient(props: DashboardProps) {
  const {
    canAccessOperationsConsole = false,
  } = props;

  const s = useDashboardState(props);
  const visibleTabs = useVisibleTabs(s.ent, canAccessOperationsConsole);

  // Single-App view: if only one unlocked app tab, auto-navigate there on mount
  const unlockedApps = visibleTabs.filter((t) => !t.locked && t.id !== "my-account");
  useEffect(() => {
    if (unlockedApps.length === 1 && s.activeTab === "overview") {
      s.setActiveTab(unlockedApps[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden">
      <DashboardHeader
        user={props.user}
        tier={props.tier}
        isCeo={props.isSlateCeo ?? false}
        internalAccess={s.internalAccess}
        searchPlaceholder="Search projects, files, contacts…"
        prefsDirty={s.prefsDirty}
        onCustomizeOpen={() => s.setCustomizeOpen(true)}
        notifications={s.unreadNotifications}
        notificationsLoading={s.notificationsLoading}
        onRefreshNotifications={s.loadUnreadNotifications}
      />

      {/* ════════ MAIN CONTENT ════════ */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden">


        {s.billingNotice && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${s.billingNotice.ok ? "border-emerald-700/50 bg-emerald-950/30 text-emerald-400" : "border-amber-700/50 bg-amber-950/30 text-amber-400"}`}>
            {s.billingNotice.text}
          </div>
        )}

        {s.activeTab !== "overview" && (
          <div className="mb-6">
            <button
              onClick={() => s.setActiveTab("overview")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-zinc-300 bg-app-card border border-app hover:bg-white/[0.04] hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        )}

        <Tabs value={s.activeTab} onValueChange={(v) => s.setActiveTab(v)} className="gap-0">
          {/* ════════ OVERVIEW TAB CONTENT ════════ */}
          <TabsContent value="overview">
            <DashboardOverview
            userName={props.user.name.split(" ")[0]}
            visibleTabs={visibleTabs}
            showDashboardTiles={s.prefShowDashboardTiles}
            onOpenSlateDrop={s.openSlateDrop}
            onSetActiveTab={s.setActiveTab}
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
          </TabsContent>

          {/* ════════ MY ACCOUNT TAB ════════ */}
          <TabsContent value="my-account">
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
          </TabsContent>

          {/* ════════ TAB REDIRECT CARDS / WIREFRAMES / UPGRADE GATES ════════ */}
          {visibleTabs
            .filter((t) => !["overview", "my-account"].includes(t.id))
            .map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                {tab.locked && tab.requiredTier ? (
                  <UpgradeGate
                    feature={tab.label}
                    requiredTier={tab.requiredTier}
                    currentTier={s.ent.tier}
                    accent={tab.color}
                    icon={tab.icon}
                  />
                ) : hasRedirectRoute(tab.id) ? (
                  <TabRedirectCard tab={tab} />
                ) : (
                  <TabWireframe tab={tab} onBack={() => s.setActiveTab("overview")} onOpenSlateDrop={s.openSlateDrop} />
                )}
              </TabsContent>
            ))}
        </Tabs>
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
