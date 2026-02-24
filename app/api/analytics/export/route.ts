import { NextRequest, NextResponse } from "next/server";

type Scope = "projects" | "tours" | "media" | "workspace";
type Format = "pdf" | "csv";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    scope?: Scope;
    format?: Format;
  };

  const scope: Scope = body.scope && ["projects", "tours", "media", "workspace"].includes(body.scope)
    ? body.scope
    : "projects";
  const format: Format = body.format === "csv" ? "csv" : "pdf";

  const filename = `analytics-${scope}-${new Date().toISOString().slice(0, 10)}.${format}`;

  return NextResponse.json({
    scope,
    format,
    url: `/downloads/mock/${filename}`,
  });
}
