import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { badRequest } from "@/lib/server/api-response";
import {
  PROJECT_VIEW_COOKIE,
  isProjectViewMode,
} from "@/lib/server/project-view";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const mode = (body as { mode?: unknown })?.mode;
  if (!isProjectViewMode(mode)) {
    return badRequest("Unknown view mode");
  }

  const store = await cookies();
  store.set(PROJECT_VIEW_COOKIE, mode, {
    path: "/",
    httpOnly: false, // Read by server components only; client just sets it.
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true, mode });
}
