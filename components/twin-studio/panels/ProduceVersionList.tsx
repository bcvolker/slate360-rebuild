"use client";

import Link from "next/link";
import { Check, Eye } from "lucide-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

export type ProduceVersion = {
  id: string;
  title: string | null;
  createdAt: string;
  isPublished: boolean;
  fileSizeBytes: number | null;
  psnr: number | null;
  splatCount: number | null;
  quality: string | null;
  trainProfile: string | null;
  captureId: string | null;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

/** Version rows with Preview (any version, no publish needed) + Publish. */
export function ProduceVersionList({
  spaceId,
  versions,
  busy,
  onPublish,
}: {
  spaceId: string;
  versions: ProduceVersion[];
  busy: boolean;
  onPublish: (modelId: string) => void;
}) {
  if (versions.length === 0) {
    return <p className="text-xs text-[var(--graphite-muted)]">No ready versions yet.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {versions.map((v) => (
        <li
          key={v.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-zinc-100">{formatDate(v.createdAt)}</p>
            <p className="mt-0.5 text-[10px] text-[var(--graphite-muted)]">
              {v.psnr !== null ? `PSNR ${v.psnr.toFixed(2)}` : "PSNR —"}
              {v.quality ? ` · ${v.quality}` : ""}
              {v.trainProfile ? ` · ${v.trainProfile}` : ""}
              {v.splatCount !== null ? ` · ${(v.splatCount / 1000).toFixed(0)}k pts` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href={`/twin-studio/${spaceId}/preview/${v.id}`}
              className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] font-semibold text-zinc-200 transition hover:border-[var(--accent-border-blue)] hover:text-[var(--twin360-blue)]"
            >
              <Eye className="size-3" aria-hidden /> Preview
            </Link>
            {v.isPublished ? (
              <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold ${twinAccent.iconChip}`}>
                <Check className="size-3" /> Live
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onPublish(v.id)}
                disabled={busy}
                className="rounded-md border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-zinc-200 transition hover:border-[var(--accent-border-blue)] hover:text-[var(--twin360-blue)] disabled:opacity-50"
              >
                Publish
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
