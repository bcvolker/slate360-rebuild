"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileEmptyState } from "@/components/mobile-system";
import { type RouterLike } from "./v1-view-utils";

export type V1DeliverableRow = {
  id: string;
  title: string;
  deliverable_type: string;
  status: string;
  created_at: string;
  share_token: string | null;
};

type DeliverablesViewProps = {
  deliverables?: V1DeliverableRow[];
  router?: RouterLike;
  openHomeDock?: (panel: "recent") => void;
};

const STATUS_STYLE: Record<string, string> = {
  draft: "text-zinc-400",
  in_review: "text-amber-300",
  approved: "text-emerald-300",
  shared: "text-teal-300",
  published: "text-teal-300",
  archived: "text-zinc-500",
};

export function DeliverablesView({
  deliverables = [],
  router: routerProp,
  openHomeDock,
}: DeliverablesViewProps) {
  const routerFromHook = useRouter();
  const router = routerProp ?? routerFromHook;
  const openRecent = () =>
    openHomeDock ? openHomeDock("recent") : router.push("/site-walk?tab=recent");
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-300">Deliverables</p>
        <Button
          size="sm"
          className="gap-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
          onClick={openRecent}
        >
          <Plus className="size-3.5" />
          From Walk
        </Button>
      </div>

      {deliverables.length === 0 ? (
        <MobileEmptyState
          icon={FileText}
          title="No deliverables yet"
          description="Complete a walk, review captures, then create a deliverable from the walk summary."
          actionLabel="Open walks"
          onAction={openRecent}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {deliverables.map((d) => (
            <article
              key={d.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                    {d.deliverable_type.replace(/_/g, " ")}
                  </p>
                  <h3 className="mt-0.5 truncate text-sm font-semibold text-white">
                    {d.title || "Untitled deliverable"}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="size-3" />
                    {new Date(d.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span className="mx-1">·</span>
                    <span className={STATUS_STYLE[d.status] ?? STATUS_STYLE.draft}>
                      {d.status.replace(/_/g, " ")}
                    </span>
                  </p>
                </div>
                {d.share_token && (
                  <Link
                    href={`/share/deliverable/${d.share_token}`}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-amber-200"
                    title="Open shared deliverable"
                  >
                    <ExternalLink className="size-4" />
                  </Link>
                )}
              </div>
            </article>
          ))}
          <Link
            href="/site-walk/deliverables"
            className="mt-1 hidden rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] md:block"
          >
            View all deliverables
          </Link>
          <Link
            href="/site-walk?tab=deliverables"
            className="mt-1 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-center text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] md:hidden"
          >
            View all deliverables
          </Link>
        </div>
      )}
    </div>
  );
}
