import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { loadUnsubmittedTwinCaptures } from "@/lib/digital-twin/load-unsubmitted-captures";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { matchesTwinStatusFilter } from "@/lib/digital-twin/twin-hub-status";
import { MobileEmptyState } from "@/components/mobile-system";
import { UnsubmittedCaptureRow } from "@/components/digital-twin/UnsubmittedCaptureRow";
import type { HubTwin } from "@/lib/types/digital-twin-hub";
import { Boxes, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DOCK_EMPTY_ACTION = cn("text-[12px]", twinAccent.link);

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function TwinCard({ twin }: { twin: HubTwin }) {
  const chip = twin.statusChip.toLowerCase();
  const isReady = chip === "ready";
  const isFailed = chip === "failed";
  // One accent (twin blue) on interactive/status state; failed reads neutral + red text.
  const chipClass = isFailed
    ? "border-white/10 bg-white/[0.04] text-[var(--destructive)]"
    : isReady
      ? "border-[color-mix(in_srgb,var(--twin360-blue)_45%,transparent)] bg-[color-mix(in_srgb,var(--twin360-blue)_14%,transparent)] text-[var(--twin360-blue)]"
      : "border-[color-mix(in_srgb,var(--twin360-blue)_28%,transparent)] bg-[color-mix(in_srgb,var(--twin360-blue)_8%,transparent)] text-[var(--twin360-blue)]";
  return (
    <Link
      href={`/digital-twin/twins/${twin.id}`}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 backdrop-blur-md transition-colors hover:border-[color-mix(in_srgb,var(--twin360-blue)_40%,transparent)]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--twin360-blue)_28%,transparent)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] text-[var(--twin360-blue)]">
        <Boxes className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{twin.title}</p>
        <p className="mt-0.5 truncate text-xs text-zinc-400">
          {twin.projectName ?? "No project"} · {relativeDate(twin.updatedAt)}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-md border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide",
          chipClass,
        )}
      >
        {twin.statusChip}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
    </Link>
  );
}

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function DigitalTwinTwinsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params.status?.toLowerCase();

  const context = await resolveServerOrgContext();
  const [{ twins }, { main: unsubmitted, staleDrafts }] = await Promise.all([
    loadDigitalTwinHubData(context.orgId),
    loadUnsubmittedTwinCaptures(context.orgId),
  ]);
  const showingDrafts = statusFilter === "drafts";
  const filteredTwins = showingDrafts
    ? []
    : twins.filter((twin) => matchesTwinStatusFilter(twin.statusChip, statusFilter));

  const filterLabel =
    statusFilter === "processing"
      ? "Processing"
      : statusFilter === "ready"
        ? "Ready"
        : statusFilter === "failed"
          ? "Failed"
          : showingDrafts
            ? "Drafts"
            : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
      {filterLabel ? (
        <p className="mb-3 text-xs font-medium text-zinc-400">
          Showing {filterLabel.toLowerCase()} {showingDrafts ? "" : "twins"}
          {" · "}
          <Link href="/digital-twin/twins" className={twinAccent.link}>
            Clear filter
          </Link>
        </p>
      ) : staleDrafts.length > 0 ? (
        <p className="mb-3 text-xs font-medium text-zinc-400">
          <Link href="/digital-twin/twins?status=drafts" className={twinAccent.link}>
            {staleDrafts.length} old draft{staleDrafts.length === 1 ? "" : "s"} hidden
          </Link>
        </p>
      ) : null}

      {showingDrafts ? (
        <section className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Drafts
          </p>
          <p className="mb-3 text-[11px] leading-snug text-zinc-500">
            Empty captures with nothing uploaded yet, started more than a day ago. Resume one, or
            leave it — nothing here is deleted automatically.
          </p>
          {staleDrafts.length > 0 ? (
            <ul className="space-y-2">
              {staleDrafts.map((capture) => (
                <li key={capture.id}>
                  <UnsubmittedCaptureRow
                    capture={capture}
                    workspaces={twins.map((t) => ({ id: t.id, title: t.title }))}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">No drafts.</p>
          )}
        </section>
      ) : null}

      {!showingDrafts && !statusFilter && unsubmitted.length > 0 ? (
        <section className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Continue your captures
          </p>
          <p className="mb-3 text-[11px] leading-snug text-zinc-500">
            Saved from your phone, not yet submitted. Add 360, drone, GPS, or more scans here, then submit.
          </p>
          <ul className="space-y-2">
            {unsubmitted.map((capture) => (
              <li key={capture.id}>
                <UnsubmittedCaptureRow
                  capture={capture}
                  workspaces={twins.map((t) => ({ id: t.id, title: t.title }))}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showingDrafts ? null : filteredTwins.length > 0 ? (
        <ul className="space-y-2">
          {filteredTwins.map((twin) => (
            <li key={twin.id}>
              <TwinCard twin={twin} />
            </li>
          ))}
        </ul>
      ) : (
        <MobileEmptyState
          icon={Boxes}
          title={
            statusFilter
              ? `No ${filterLabel?.toLowerCase() ?? "matching"} twins`
              : "No twins in this workspace yet"
          }
          actionLabel="Start quick capture"
          actionClassName={DOCK_EMPTY_ACTION}
          actionHref="/digital-twin/capture"
        />
      )}

      <p className="mt-6 text-center text-xs text-zinc-500">
        Advanced editing and publishing run on{" "}
        <Link href="/design-studio" className={twinAccent.link}>
          desktop
        </Link>
        .
      </p>
    </div>
  );
}
