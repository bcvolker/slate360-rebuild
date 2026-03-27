"use client";

import WidgetCard from "@/components/widgets/WidgetCard";
import { Bell } from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

export interface AccountPreferencesCardProps {
  prefTheme: "light" | "dark" | "system";
  onPrefThemeChange: (value: "light" | "dark" | "system") => void;
  prefStartTab: string;
  onPrefStartTabChange: (value: string) => void;
  prefNotification: "off" | "daily" | "weekly";
  onPrefNotificationChange: (value: "off" | "daily" | "weekly") => void;
  prefImportantAlerts: boolean;
  onPrefImportantAlertsChange: (value: boolean) => void;
  prefShowDashboardTiles: boolean;
  onPrefShowDashboardTilesChange: (value: boolean) => void;
  onSavePreferences: () => void;
  profileCompletion: number;
}

/* ================================================================
   COMPONENT
   ================================================================ */

export default function AccountPreferencesCard({
  prefTheme,
  onPrefThemeChange,
  prefStartTab,
  onPrefStartTabChange,
  prefNotification,
  onPrefNotificationChange,
  prefImportantAlerts,
  onPrefImportantAlertsChange,
  prefShowDashboardTiles,
  onPrefShowDashboardTilesChange,
  onSavePreferences,
  profileCompletion,
}: AccountPreferencesCardProps) {
  return (
    <WidgetCard icon={Bell} title="Profile & Preferences">
      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Theme
          </p>
          <select
            value={prefTheme}
            onChange={(e) =>
              onPrefThemeChange(e.target.value as "light" | "dark" | "system")
            }
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Default Start Tab
          </p>
          <select
            value={prefStartTab}
            onChange={(e) => onPrefStartTabChange(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white"
          >
            <option value="overview">Dashboard</option>
            <option value="project-hub">Project Hub</option>
            <option value="tours">360 Tours</option>
            <option value="content-studio">Content Studio</option>
          </select>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Notification Frequency
          </p>
          <select
            value={prefNotification}
            onChange={(e) =>
              onPrefNotificationChange(
                e.target.value as "off" | "daily" | "weekly",
              )
            }
            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white"
          >
            <option value="off">Off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <label className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-gray-700">
            Important Alerts
          </span>
          <input
            type="checkbox"
            checked={prefImportantAlerts}
            onChange={(e) => onPrefImportantAlertsChange(e.target.checked)}
            className="h-4 w-4 accent-[#FF4D00]"
          />
        </label>
        <label className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-gray-700">
            Show Dashboard Tiles
          </span>
          <input
            type="checkbox"
            checked={prefShowDashboardTiles}
            onChange={(e) => onPrefShowDashboardTilesChange(e.target.checked)}
            className="h-4 w-4 accent-[#FF4D00]"
          />
        </label>
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-700">
              Profile Completeness
            </span>
            <span className="text-xs font-bold text-gray-900">
              {profileCompletion}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#FF4D00]"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
        </div>
        <button
          onClick={onSavePreferences}
          className="w-full text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Save Preferences
        </button>
      </div>
    </WidgetCard>
  );
}
