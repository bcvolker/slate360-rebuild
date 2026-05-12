import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, serverError } from "@/lib/server/api-response";

export const maxDuration = 300; // Allow 5 mins for large sets

export const POST = (req: NextRequest, ctx: any) =>
  withAppAuth("punchwalk", req, async ({ orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    
    return serverError("Rasterization worker is currently disabled pending migration to external worker queue (Trigger.dev/Supabase Edge). This route is currently a stub to prevent Next.js build failures with @napi-rs/canvas.");
  });
