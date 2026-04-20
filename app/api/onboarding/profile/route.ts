import type { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

const Schema = z.object({
  primaryUseCase: z.array(z.string().max(64)).max(8),
});

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ user, admin }) => {
    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { error } = await admin
      .from("profiles")
      .update({
        primary_use_case: parsed.data.primaryUseCase,
        profile_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) return serverError(error.message);
    return ok({ ok: true });
  });
}
