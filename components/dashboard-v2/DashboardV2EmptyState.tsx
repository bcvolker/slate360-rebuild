import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardV2EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function DashboardV2EmptyState({
  icon: Icon,
  message,
  actionLabel,
  actionHref,
  className,
}: DashboardV2EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center",
        className,
      )}
    >
      {Icon && <Icon className="h-5 w-5 text-zinc-600" />}
      <p className="text-sm text-zinc-500">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="text-sm font-medium text-amber-400 hover:underline"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
