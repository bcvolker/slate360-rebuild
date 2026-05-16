import type { Entitlements } from "@/lib/entitlements";
import { DashboardV2AppLauncher } from "./DashboardV2AppLauncher";
import { DashboardV2QuickActions } from "./DashboardV2QuickActions";

interface DashboardV2ShellProps {
  entitlements: Entitlements | null;
  isSlateCeo: boolean;
}

/**
 * DashboardV2Shell — content shell for the Dashboard V2 preview.
 *
 * This renders inside the existing AppShell (header, sidebar, bottom nav)
 * provided by app/(dashboard)/layout.tsx. It does NOT create a second
 * header or navigation — AppShell already owns those.
 *
 * Slice 1: App Launcher + Quick Actions.
 * Slice 2: Activity Panel (Alerts / Messages / Assigned / Recent).
 */
export function DashboardV2Shell({ entitlements, isSlateCeo }: DashboardV2ShellProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto px-4 pb-6 pt-4 no-scrollbar">
      <DashboardV2AppLauncher entitlements={entitlements} isSlateCeo={isSlateCeo} />
      <DashboardV2QuickActions />
      {/*
       * Activity Panel — Slice 2.
       * Will contain real data from: project_notifications (Alerts),
       * site_walk_assignments (Assigned), site_walk_sessions (Recent).
       * Messages tab deferred until a real messages table exists.
       * Do not add placeholder rows or blank cards here.
       */}
    </div>
  );
}
