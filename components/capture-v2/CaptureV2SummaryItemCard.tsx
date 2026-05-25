"use client";

import Link from "next/link";
import { AlertTriangle, Camera, ChevronRight, FileText } from "lucide-react";
import { buildCaptureV2LaunchUrl } from "@/lib/site-walk/capture-v2-config";
import {
  deriveCaptureV2StoredItemSyncKind,
  itemNeedsCaptureDetails,
} from "./capture-v2-item-sync";
import { CaptureV2ItemSyncBadge } from "./CaptureV2SyncBadge";
import type { CaptureV2SummaryItem } from "./capture-v2-summary-types";

type Props = {
  sessionId: string;
  item: CaptureV2SummaryItem;
  stopNumber: number;
  highlight?: boolean;
};

export function CaptureV2SummaryItemCard({ sessionId, item, stopNumber, highlight = false }: Props) {
  const isPhoto = item.itemType === "photo";
  const thumbUrl = isPhoto ? `/api/site-walk/items/${encodeURIComponent(item.id)}/image` : null;
  const syncKind = deriveCaptureV2StoredItemSyncKind({
    id: item.id,
    sync_state: item.syncState,
    upload_state: item.uploadState,
  });
  const needsDetails = itemNeedsCaptureDetails(item);
  const focusHref = buildCaptureV2LaunchUrl({ session: sessionId, item: item.id, plan: "skip" });
  const classification = item.classification?.trim();
  const trade = item.trade?.trim();
  const metaParts = [classification, trade].filter(Boolean);

  return (
    <Link
      href={focusHref}
      className={`group grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.4rem] border p-2 shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition hover:border-amber-400/30 hover:bg-white/[0.07] ${
        highlight
          ? "border-emerald-400/35 bg-emerald-500/[0.08] ring-1 ring-emerald-400/20"
          : "border-white/10 bg-white/[0.05]"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-slate-900">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">
            {item.itemType === "text_note" ? <FileText className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
          </div>
        )}
        <span className="absolute left-1.5 top-1.5 rounded-md bg-slate-950/85 px-1.5 py-0.5 text-[9px] font-black text-amber-200">
          #{stopNumber}
        </span>
      </div>

      <div className="min-w-0 py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-300">
            {item.itemStatus.replace(/_/g, " ")}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-400">
            {item.priority}
          </span>
          <CaptureV2ItemSyncBadge kind={syncKind} compact />
        </div>

        <h2 className="mt-1.5 truncate text-base font-black text-white group-hover:text-amber-100">
          {item.title?.trim() || `Stop ${stopNumber}`}
        </h2>

        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-400">
          {item.description?.trim() || "No notes added yet."}
        </p>

        {metaParts.length > 0 && (
          <p className="mt-1.5 truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {metaParts.join(" · ")}
          </p>
        )}

        {needsDetails && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-200">
            <AlertTriangle className="h-3 w-3" />
            Missing title or notes
          </p>
        )}
      </div>

      <ChevronRight className="mr-1 h-5 w-5 shrink-0 text-slate-600 group-hover:text-amber-300" aria-hidden />
    </Link>
  );
}
