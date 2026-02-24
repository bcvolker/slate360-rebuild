import { NextRequest, NextResponse } from "next/server";

type Scope = "projects" | "tours" | "media" | "workspace";

const INSIGHTS: Record<Scope, string> = {
  projects:
    "Project throughput is strongest in the last 14 days; consider reallocating field-review capacity to keep closeout velocity high.",
  tours:
    "360 tour engagement rose sharply this week; prioritize annotation cleanup to convert high view counts into faster approvals.",
  media:
    "Media uploads are trending upward while archive actions lag; introducing retention tags can reduce storage growth by 10-15%.",
  workspace:
    "Workspace usage concentration is high across two teams; redistributing dashboard defaults may improve cross-team adoption.",
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { scope?: Scope };
  const scope: Scope = body.scope && body.scope in INSIGHTS ? body.scope : "projects";

  return NextResponse.json({
    scope,
    insight: INSIGHTS[scope],
  });
}
