import { headers } from "next/headers";
import { ThermalShareViewer } from "@/components/share/thermal/ThermalShareViewer";
import { ThermalSharePasswordGate } from "@/components/share/thermal/ThermalSharePasswordGate";
import { loadThermalShareViewerData } from "@/lib/thermal/load-share-viewer";
import { isThermalShareUnlocked } from "@/lib/thermal/share-access";
import {
  claimThermalShareView,
  resolveThermalShareToken,
  thermalShareDenyToPortalState,
} from "@/lib/thermal/share-token";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ embed?: string }>;
};

export default async function SharedThermalPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { embed: embedParam } = await searchParams;
  const embed = embedParam === "1";

  const gate = await resolveThermalShareToken(token);
  if (!gate.ok) {
    return <ThermalShareViewer data={null} tokenState={thermalShareDenyToPortalState(gate.reason)} embed={embed} />;
  }

  if (gate.requiresPassword && !(await isThermalShareUnlocked(token))) {
    return <ThermalSharePasswordGate token={token} embed={embed} />;
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = hdrs.get("user-agent") ?? "unknown";

  const claimed = await claimThermalShareView(token, ip, ua);
  if (!claimed) {
    return <ThermalShareViewer data={null} tokenState="unavailable" embed={embed} />;
  }

  const data = await loadThermalShareViewerData(
    claimed.session_id as string,
    (claimed.branding_snapshot as Record<string, unknown>) ?? {},
    (claimed.layer_config as Record<string, unknown>) ?? {},
  );

  if (!data) {
    return <ThermalShareViewer data={null} tokenState="unavailable" embed={embed} />;
  }

  return (
    <ThermalShareViewer
      data={{ ...data, role: claimed.role as string }}
      token={token}
      embed={embed}
    />
  );
}
