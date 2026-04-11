import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/server/api-auth";

type Scope = "projects" | "tours" | "media" | "workspace";
type Format = "pdf" | "csv";

export const POST = (request: NextRequest) =>
  withAuth(request, async () => {
    const body = (await request.json().catch(() => ({}))) as {
      scope?: Scope;
      format?: Format;
    };

    const scope: Scope = body.scope && ["projects", "tours", "media", "workspace"].includes(body.scope)
      ? body.scope
      : "projects";
    const format: Format = body.format === "csv" ? "csv" : "pdf";

    const filename = `analytics-${scope}-${new Date().toISOString().slice(0, 10)}.${format}`;

    // TODO: Generate real export from Supabase data and upload to S3
    // For now, return a clear error instead of a fake mock URL
    return NextResponse.json({
      error: "Analytics export is not yet available. This feature is under development.",
    }, { status: 501 });
  });
