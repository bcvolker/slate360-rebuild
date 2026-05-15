"use client";

import type { useRouter } from "next/navigation";

/** Shared router type for V1 view components. */
export type RouterLike = ReturnType<typeof useRouter>;

/** Human-readable relative time string. */
export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Shared empty-state list placeholder. */
export function EmptyList({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-white/5 py-8">
      <p className="max-w-[260px] text-center text-xs text-zinc-600">{message}</p>
    </div>
  );
}
