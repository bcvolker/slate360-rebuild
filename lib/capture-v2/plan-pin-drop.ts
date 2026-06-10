import type { SiteWalkPin } from "@/lib/types/site-walk";

export type DropPlanPinArgs = {
  planSheetId: string;
  sessionId: string;
  projectId?: string | null;
  xPct: number;
  yPct: number;
  clientPinId: string;
  pinNumber: number;
};

export async function dropPlanPin(args: DropPlanPinArgs): Promise<SiteWalkPin> {
  const response = await fetch("/api/site-walk/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_sheet_id: args.planSheetId,
      session_id: args.sessionId,
      project_id: args.projectId ?? null,
      x_pct: args.xPct,
      y_pct: args.yPct,
      client_pin_id: args.clientPinId,
      pin_number: args.pinNumber,
      pin_color: "green",
      pin_status: "draft",
    }),
  });
  const payload = (await response.json().catch(() => null)) as { pin?: SiteWalkPin; error?: string } | null;
  if (!response.ok || !payload?.pin) {
    throw new Error(payload?.error ?? "Failed to create plan pin.");
  }
  return payload.pin;
}
