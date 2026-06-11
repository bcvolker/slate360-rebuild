import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { matchesTwinStatusFilter, twinHubStatusMetaTone } from "@/lib/digital-twin/twin-hub-status";
import { MobileEmptyState, MobileHomeListRow, mobileTokens } from "@/components/mobile-system";
import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

const DOCK_EMPTY_ACTION = cn("text-[12px]", twinAccent.link);

type PageProps = {
  searchParams?: Promise<{ status?: string }>;
};

export default async function DigitalTwinTwinsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const statusFilter = params.status?.toLowerCase();

  const context = await resolveServerOrgContext();
  const { twins } = await loadDigitalTwinHubData(context.orgId);
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
