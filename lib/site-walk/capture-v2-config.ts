import { SITE_WALK_CAPTURE_V2_ROUTES } from "@/lib/site-walk/capture-v2-routes";

/** Side-by-side V2 testing flag — set NEXT_PUBLIC_CAPTURE_V2=true in .env.local */
export const CAPTURE_V2_ENABLED = process.env.NEXT_PUBLIC_CAPTURE_V2 === "true";

const V1_CAPTURE_BASE = "/site-walk/capture" as const;

export type CaptureLaunchQuery = {
  session: string;
  quick?: "camera";
  plan?: string;
  item?: string;
  launch?: string;
};

/** Direct V2 summary URL — for V2-only surfaces while the launch flag stays off. */
export function buildCaptureV2SummaryUrl(sessionId: string): string {
  return `${SITE_WALK_CAPTURE_V2_ROUTES.summary}?session=${encodeURIComponent(sessionId)}`;
}

/** Direct V2 capture URL — for V2-only surfaces while the launch flag stays off. */
export function buildCaptureV2LaunchUrl(query: CaptureLaunchQuery & { plan?: string }): string {
  const params = new URLSearchParams();
  params.set("session", query.session);
  if (query.quick) params.set("quick", query.quick);
  if (query.plan) params.set("plan", query.plan);
  if (query.item) params.set("item", query.item);
  if (query.launch) params.set("launch", query.launch);
  return `${SITE_WALK_CAPTURE_V2_ROUTES.capture}?${params.toString()}`;
}

/** Build capture task URL respecting the V2 feature flag. */
export function buildCaptureLaunchUrl(query: CaptureLaunchQuery): string {
  const base = CAPTURE_V2_ENABLED ? SITE_WALK_CAPTURE_V2_ROUTES.capture : V1_CAPTURE_BASE;
  const params = new URLSearchParams();
  params.set("session", query.session);
  if (query.quick) params.set("quick", query.quick);
  if (query.plan) params.set("plan", query.plan);
  if (query.item) params.set("item", query.item);
  if (query.launch) params.set("launch", query.launch);
  return `${base}?${params.toString()}`;
}

/** Build post-walk summary/review URL respecting the V2 feature flag. */
export function buildCaptureSummaryUrl(sessionId: string): string {
  if (CAPTURE_V2_ENABLED) {
    return `${SITE_WALK_CAPTURE_V2_ROUTES.summary}?session=${encodeURIComponent(sessionId)}`;
  }
  return `/site-walk/walks/${encodeURIComponent(sessionId)}`;
}

/** Resume an in-progress walk (capture) or open completed review. */
export function buildWalkResumeUrl(sessionId: string, status: string): string {
  if (status === "completed") {
    return buildCaptureSummaryUrl(sessionId);
  }
  return buildCaptureLaunchUrl({ session: sessionId });
}
