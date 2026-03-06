import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, user }) => {
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 2000) : 200;

    const { data, error } = await admin
      .from("market_activity_log")
      .select("id,level,message,context,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === "42P01") return ok({ logs: [] });
      return serverError(error.message);
    }
    return ok({ logs: data ?? [] });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const record = body as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message.trim() : "";
    if (!message) return badRequest("message is required");

    const level = typeof record.level === "string" ? record.level : "info";
    const context = record.context ?? null;

    const { error } = await admin.from("market_activity_log").insert({
      user_id: user.id,
      level,
      message,
      context,
    });

    if (error) return serverError(error.message);
    return ok({ saved: true });
  });
