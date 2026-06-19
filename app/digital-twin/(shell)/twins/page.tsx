import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { loadUnsubmittedTwinCaptures } from "@/lib/digital-twin/load-unsubmitted-captures";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { matchesTwinStatusFilter, twinHubStatusMetaTone } from "@/lib/digital-twin/twin-hub-status";
import { MobileEmptyState, MobileHomeListRow, mobileTokens } from "@/components/mobile-system";
import { Boxes, Film, Image as ImageIcon, Scan } from "lucide-react";
import { cn } from "@/lib/utils";

const DOCK_EMPTY_ACTION = cn("text-[12px]", twinAccent.link);

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function DigitalTwinTwinsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params.status?.toLowerCase();

  const context = await resolveServerOrgContext();
  const [{ twins }, unsubmitted] = await Promise.all([
    loadDigitalTwinHubData(context.orgId),
    loadUnsubmittedTwinCaptures(context.orgId),
  ]);
  const filteredTwins = twins.filter((twin) =>
    matchesTwinStatusFilter(twin.statusChip, statusFilter),
  );

  const filterLabel =
    statusFilter === "processing"
      ? "Processing"
      : statusFilter === "ready"
        ? "Ready"
        : statusFilter === "failed"
          ? "Failed"
          : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
      {filterLabel ? (
        <p className="mb-3 text-xs font-medium text-zinc-400">
          Showing {filterLabel.toLowerCase()} twins
          {" · "}
          <Link href="/digital-twin/twins" className={twinAccent.link}>
            Clear filter
          </Link>
        </p>
      ) : null}

      {!statusFilter && unsubmitted.length > 0 ? (
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
                <Link
                  href={`/digital-twin/upload?capture=${capture.id}${capture.projectId ? `&projectId=${capture.projectId}&mode=project` : ""}`}
                  className={cn(mobileTokens.mobileGlassCardSurface, "flex items-center justify-between gap-3 px-4 py-3")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-100">{capture.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                      {capture.counts.video > 0 ? (
                        <span className="inline-flex items-center gap-1"><Film className="h-3 w-3" aria-hidden /> {capture.counts.video} video</span>
                      ) : null}
                      {capture.counts.photo > 0 ? (
                        <span className="inline-flex items-center gap-1"><ImageIcon className="h-3 w-3" aria-hidden /> {capture.counts.photo} photo</span>
                      ) : null}
                      {capture.counts.lidar > 0 ? (
                        <span className="inline-flex items-center gap-1"><Scan className="h-3 w-3" aria-hidden /> {capture.counts.lidar} LiDAR</span>
                      ) : null}
                      {capture.counts.other > 0 ? <span>{capture.counts.other} other</span> : null}
                    </span>
                  </span>
                  <span className={cn("shrink-0 text-[12px] font-semibold", twinAccent.link)}>Resume →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {filteredTwins.length > 0 ? (
        <ul className={mobileTokens.mobileHomeContainedListInner}>
          {filteredTwins.map((twin) => (
            <li key={twin.id}>
              <MobileHomeListRow
                title={twin.title}
                meta={twin.statusChip}
                metaTone={twinHubStatusMetaTone(twin.statusChip)}
                href={`/digital-twin/twins/${twin.id}`}
              />
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
