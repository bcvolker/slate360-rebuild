"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Search,
  Bell,
  MessageSquare,
  ClipboardList,
  Clock,
  FolderOpen,
  Sparkles,
  Package,
} from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import {
  MobileActionGrid,
  MobileAppButton,
  MobileExpandableTabbedPanel,
  MobileEmptyState,
  MobileCreateSheet,
  MobileQuickActionStrip,
  MobileHomeLayout,
  mobileTokens,
} from "@/components/mobile-system";
import type { MobilePanelTab, MobileQuickActionItem } from "@/components/mobile-system";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface CommandCenterContentProps {
  entitlements?: Entitlements | null;
  isSlateCeo?: boolean;
}

function AppSectionHeader({
  label,
  accent = "warm",
}: {
  label: string;
  accent?: "warm" | "cool";
}) {
  return (
    <div className="mb-2">
      <span
        className={
          accent === "cool"
            ? mobileTokens.appHomeSectionLabelAccentCool
            : mobileTokens.appHomeSectionLabelAccent
        }
        aria-hidden
      />
      <p className={mobileTokens.appHomeSectionLabel} data-testid="mobile-section-label">
        {label}
      </p>
    </div>
  );
}

export function CommandCenterContent({
  entitlements = null,
}: CommandCenterContentProps) {
  const router = useRouter();
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [twinInfoOpen, setTwinInfoOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("blocked")) return;
    window.history.replaceState({}, "", "/app");
  }, []);

  const handleSearch = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }, []);

  const hasSiteWalk = entitlements?.canAccessStandalonePunchwalk ?? false;

  const activityTabs: MobilePanelTab[] = useMemo(
    () => [
      {
        value: "notifications",
        label: "Alerts",
        content: (
          <MobileEmptyState
            compact
            icon={Bell}
            title="No new notifications"
            actionLabel="View inbox"
            actionHref="/coordination/inbox"
          />
        ),
      },
      {
        value: "messages",
        label: "Messages",
        content: (
          <MobileEmptyState
            compact
            icon={MessageSquare}
            title="No unread messages"
            actionLabel="View inbox"
            actionHref="/coordination/inbox"
          />
        ),
      },
      {
        value: "assigned",
        label: "Assigned",
        content: (
          <MobileEmptyState
            compact
            icon={ClipboardList}
            title="No assigned work"
            actionLabel="View assigned"
            actionHref="/site-walk/assigned-work"
          />
        ),
      },
      {
        value: "recent",
        label: "Recent",
        content: <MobileEmptyState compact icon={Clock} title="No recent activity" />,
      },
    ],
    [],
  );

  const quickActions: MobileQuickActionItem[] = useMemo(
    () => [
      { label: "Create", icon: Plus, accent: "primary", onClick: () => setCreateSheetOpen(true) },
      { label: "SlateDrop", icon: FolderOpen, accent: "info", onClick: () => router.push("/slatedrop") },
      { label: "Search", icon: Search, accent: "muted", onClick: handleSearch },
      {
        label: "Deliverables",
        icon: Package,
        accent: "neutral",
        href: "/site-walk?tab=deliverables",
      },
    ],
    [handleSearch, router],
  );

  return (
    <>
      <MobileHomeLayout
        route="app"
        className="min-h-screen"
        contentTop={
          <section className="shrink-0">
            <AppSectionHeader label="Your Apps" />
            {hasSiteWalk ? (
              <MobileActionGrid>
                <MobileAppButton
                  title="Site Walk"
                  subtitle="Field capture"
                  icon={MapPin}
                  href="/site-walk"
                  accent="primary"
                />
                <MobileAppButton
                  title="Digital Twin"
                  subtitle="Site intelligence"
                  icon={Sparkles}
                  accent="info"
                  locked
                  badge="Preparing"
                  onPress={() => setTwinInfoOpen(true)}
                />
              </MobileActionGrid>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-zinc-500">
                No apps in your plan.{" "}
                <Link href="/more/billing" className="text-amber-400/90 hover:underline">
                  View plans
                </Link>
              </div>
            )}
          </section>
        }
        primaryActions={
          <section className="shrink-0">
            <AppSectionHeader label="Quick Actions" accent="cool" />
            <MobileQuickActionStrip actions={quickActions} />
          </section>
        }
        dock={
          <MobileExpandableTabbedPanel
            tabs={activityTabs}
            defaultTab="notifications"
            homeDockVariant="app"
          />
        }
      />

      <MobileCreateSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />

      <Sheet open={twinInfoOpen} onOpenChange={setTwinInfoOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-t border-white/10 bg-[#0B0F15] p-6 pb-12 text-slate-50 sm:max-w-none"
        >
          <SheetHeader className="space-y-2 text-left">
            <SheetTitle className="text-xl font-semibold text-slate-50">Digital Twin</SheetTitle>
          </SheetHeader>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            Digital Twin is being prepared for your account. Site Walk field capture ships first;
            your live site model and intelligence layer will appear here when ready.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="mt-6 w-full text-zinc-400 hover:text-white"
            onClick={() => setTwinInfoOpen(false)}
          >
            Close
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
