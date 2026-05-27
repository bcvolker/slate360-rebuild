import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { MobileEmptyState } from "@/components/mobile-system";
import { Boxes } from "lucide-react";

const DOCK_EMPTY_ACTION =
  "text-[12px] font-medium text-[#6EA7A0] hover:text-[#6EA7A0]/80 hover:underline";

function formatTwinStatus(status: string) {
  return status.replace(/_/g, " ");
}

export default async function DigitalTwinTwinsPage() {
  const context = await resolveServerOrgContext();
  const { twins } = await loadDigitalTwinHubData(context.orgId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4">
      {twins.length > 0 ? (
        <ul className="space-y-2">
          {twins.map((twin) => (
            <li key={twin.id}>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-3">
                <p className="truncate text-sm font-semibold text-zinc-100">{twin.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                  <span className="capitalize">{formatTwinStatus(twin.status)}</span>
                  {twin.projectName ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{twin.projectName}</span>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <MobileEmptyState
          icon={Boxes}
          title="No twins in this workspace yet"
          actionLabel="Start quick capture"
          actionClassName={DOCK_EMPTY_ACTION}
          actionHref="/digital-twin/capture"
        />
      )}

      <p className="mt-6 text-center text-xs text-zinc-500">
        Advanced editing and publishing run on{" "}
        <Link href="/design-studio" className="text-[#6EA7A0] hover:underline">
          desktop
        </Link>
        .
      </p>
    </div>
  );
}
