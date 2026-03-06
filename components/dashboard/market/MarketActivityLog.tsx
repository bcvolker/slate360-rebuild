import React from "react";
import type { MarketActivityLogEntry } from "@/components/dashboard/market/types";

type MarketActivityLogProps = {
  activityLogs: MarketActivityLogEntry[];
  scanLog: string[];
  emptyText: string;
  maxScanRows?: number;
};

export default function MarketActivityLog({
  activityLogs,
  scanLog,
  emptyText,
  maxScanRows,
}: MarketActivityLogProps) {
  const scanRows = typeof maxScanRows === "number" ? scanLog.slice(0, maxScanRows) : scanLog;

  if (activityLogs.length === 0 && scanRows.length === 0) {
    return <span className="text-gray-400">{emptyText}</span>;
  }

  if (activityLogs.length > 0) {
    return (
      <>
        {activityLogs.map((entry) => (
          <div
            key={entry.id}
            className={`${
              entry.level === "error"
                ? "text-red-600"
                : entry.level === "warn"
                  ? "text-amber-600"
                  : "text-gray-600"
            }`}
          >
            [{new Date(entry.created_at).toLocaleTimeString()}] {entry.message}
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {scanRows.map((line, index) => (
        <div
          key={`${line}-${index}`}
          className={`${
            line.includes("✅")
              ? "text-green-600"
              : line.includes("❌")
                ? "text-red-600"
                : line.includes("⚠️")
                  ? "text-yellow-600"
                  : "text-gray-500"
          }`}
        >
          {line}
        </div>
      ))}
    </>
  );
}
