import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const scope = (request.nextUrl.searchParams.get("scope") ?? "projects") as
    | "projects"
    | "tours"
    | "media"
    | "workspace";

  const reports = [
    {
      id: "report-001",
      title: "Weekly Activity Report",
      createdAt: "2026-02-22T16:05:00.000Z",
      scope,
      status: "ready",
    },
    {
      id: "report-002",
      title: "Storage & Usage Trends",
      createdAt: "2026-02-21T11:30:00.000Z",
      scope,
      status: "ready",
    },
    {
      id: "report-003",
      title: "Engagement Overview",
      createdAt: "2026-02-20T08:50:00.000Z",
      scope,
      status: "processing",
    },
  ];

  return NextResponse.json({ scope, reports });
}
