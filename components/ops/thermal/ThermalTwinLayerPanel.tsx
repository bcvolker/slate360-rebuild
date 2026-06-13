import Link from "next/link";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type Props = {
  linkedSpaceId: string | null;
  projectId: string | null;
};

export function ThermalTwinLayerPanel({ linkedSpaceId, projectId }: Props) {
  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Digital Twin layer</p>
      {linkedSpaceId ? (
        <>
          <p className="mt-2 text-sm text-[var(--graphite-text-body)]">
            This session is linked to twin space{" "}
            <span className="font-mono text-xs text-[var(--graphite-primary)]">{linkedSpaceId}</span>.
          </p>
          <p className="mt-2 text-xs text-[var(--graphite-muted)]">
            Thermal overlay toggle will appear in Desktop Twin 360 Studio once Slice 3 alignment is deployed.
          </p>
          {projectId ? (
            <Link
              href={`/digital-twin/twins/${linkedSpaceId}`}
              className="mt-3 inline-flex text-sm text-[var(--graphite-primary)] hover:underline"
            >
              Open linked twin →
            </Link>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--graphite-muted)]">
          No linked twin space yet. Set{" "}
          <span className="font-mono text-xs">metadata.linked_space_id</span> on the session to enable the thermal
          layer stub. Full COLMAP + LiDAR alignment is a follow-up slice.
        </p>
      )}
    </div>
  );
}
