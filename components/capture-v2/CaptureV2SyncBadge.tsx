"use client";

import { useMemo } from "react";
import { AlertTriangle, Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import {
  CAPTURE_V2_ITEM_SYNC_LABEL,
  type CaptureV2ItemSyncKind,
} from "./capture-v2-item-sync";

type SessionProps = {
  variant: "session";
  isOnline: boolean;
  isSyncing: boolean;
  pendingUploadCount: number;
  className?: string;
};

type ItemProps = {
  variant: "item";
  kind: CaptureV2ItemSyncKind;
  compact?: boolean;
  className?: string;
};

export type CaptureV2SyncBadgeProps = SessionProps | ItemProps;

export function CaptureV2SyncBadge(props: CaptureV2SyncBadgeProps) {
  if (props.variant === "session") {
    return <CaptureV2SessionSyncBadge {...props} />;
  }
  return <CaptureV2ItemSyncBadge {...props} />;
}

export function CaptureV2SessionSyncBadge({
  isOnline,
  isSyncing,
  pendingUploadCount,
  className = "",
}: Omit<SessionProps, "variant">) {
  const label = useMemo(() => {
    if (!isOnline) {
      return pendingUploadCount > 0 ? `Offline · ${pendingUploadCount} pending` : "Offline";
    }
    if (isSyncing) return "Syncing";
    if (pendingUploadCount > 0) return `${pendingUploadCount} pending`;
    return "Synced";
  }, [isOnline, isSyncing, pendingUploadCount]);

  const tone =
    !isOnline || pendingUploadCount > 0 || isSyncing
      ? "border-white/10 bg-white/[0.05] text-[var(--graphite-muted)]"
      : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black ${tone} ${className}`}
    >
      {isSyncing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isOnline ? (
        <Cloud className="h-3 w-3" />
      ) : (
        <CloudOff className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

export function CaptureV2ItemSyncBadge({
  kind,
  compact = false,
  className = "",
}: Omit<ItemProps, "variant">) {
  const label = CAPTURE_V2_ITEM_SYNC_LABEL[kind];
  const tone =
    kind === "sync_error"
      ? "border-red-400/35 bg-red-500/15 text-red-200"
      : kind === "offline_queued"
        ? "border-white/10 bg-white/[0.05] text-[var(--graphite-muted)]"
        : kind === "saving"
          ? "border-white/10 bg-white/[0.05] text-[var(--graphite-muted)]"
          : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";

  if (compact) {
    return (
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${tone} ${className}`}
        title={label}
        aria-label={label}
      >
        {kind === "saving" ? (
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        ) : kind === "sync_error" ? (
          <AlertTriangle className="h-2.5 w-2.5" />
        ) : kind === "offline_queued" ? (
          <CloudOff className="h-2.5 w-2.5" />
        ) : (
          <Check className="h-2.5 w-2.5" />
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-black ${tone} ${className}`}>
      {kind === "saving" ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : kind === "sync_error" ? (
        <AlertTriangle className="h-2.5 w-2.5" />
      ) : kind === "offline_queued" ? (
        <CloudOff className="h-2.5 w-2.5" />
      ) : (
        <Check className="h-2.5 w-2.5" />
      )}
      {label}
    </span>
  );
}
