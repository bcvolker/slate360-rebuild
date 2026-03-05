import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/server/api-auth";

export const GET = (request: NextRequest) =>
  withAuth(request, async () => {
    const scope = (request.nextUrl.searchParams.get("scope") ?? "projects") as
      | "projects"
      | "tours"
      | "media"
      | "workspace";

    const summaryByScope = {
      projects: {
        totalProjects: 18,
        activeTours: 9,
        mediaAssets: 124,
        storageUsedGb: 212,
        storageLimitGb: 750,
        monthlyViews: 4620,
      },
      tours: {
        totalProjects: 11,
        activeTours: 16,
        mediaAssets: 92,
        storageUsedGb: 148,
        storageLimitGb: 750,
        monthlyViews: 7320,
      },
      media: {
        totalProjects: 14,
        activeTours: 8,
        mediaAssets: 389,
        storageUsedGb: 534,
        storageLimitGb: 750,
        monthlyViews: 2980,
      },
      workspace: {
        totalProjects: 21,
        activeTours: 20,
        mediaAssets: 441,
        storageUsedGb: 603,
        storageLimitGb: 750,
        monthlyViews: 12840,
      },
    };

    const metrics = summaryByScope[scope] ?? summaryByScope.projects;

    return NextResponse.json({ scope, metrics });
  });
