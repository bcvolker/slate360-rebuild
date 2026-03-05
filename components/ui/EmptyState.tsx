/**
 * EmptyState — shared empty state component.
 * Used in all tool pages and widgets when no data is available.
 */
"use client";

import type { LucideIcon } from "lucide-react";
import { InboxIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export default function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  compact = false,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 gap-2" : "py-12 gap-4",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "rounded-2xl flex items-center justify-center bg-gray-100",
          compact ? "w-10 h-10" : "w-14 h-14",
        ].join(" ")}
      >
        <Icon size={compact ? 18 : 24} className="text-gray-400" />
      </div>
      <div className="space-y-1">
        <p className={compact ? "text-xs font-semibold text-gray-500" : "text-sm font-semibold text-gray-700"}>
          {title}
        </p>
        {description && (
          <p className="text-[11px] text-gray-400 max-w-[220px] leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
